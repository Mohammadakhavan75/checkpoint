import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../lib/api";
import type { Checkpoint, Mission } from "../lib/types";
import { MissionSnapshotPage } from "./MissionSnapshotPage";

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {
    status = 500;
  },
  api: {
    mission: vi.fn(),
    checkpoints: vi.fn(),
    domains: vi.fn(),
    updateMission: vi.fn(),
  },
}));

const mission: Mission = {
  id: "mission-1",
  domain_id: null,
  title: "Finish anomaly detection direction",
  status: "active",
  active_rank: 1,
  why_matters: "It clarifies the paper.",
  success_condition: "Three contribution claims drafted.",
  current_state: "Two sources reviewed.",
  last_decision: "Keep the narrow novelty frame.",
  blockers: "Need one more citation.",
  files_links: "notes.md",
  reentry_note: "Start with the contribution list.",
  next_action: "Open notes.md and write three claims.",
  do_not_rethink: "Do not revisit tooling.",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const checkpoints: Checkpoint[] = [
  {
    id: "older-checkpoint",
    mission_id: "mission-1",
    changed: "Compared framing.",
    decision: "Keep scope narrow.",
    where_stopped: "Older stopping point.",
    next_action: "Open notes.md.",
    do_not_rethink: "Do not switch tools.",
    created_at: "2026-05-09T10:00:00.000Z",
  },
  {
    id: "newer-checkpoint",
    mission_id: "mission-1",
    changed: "Drafted the first claim.",
    decision: "Lead with application impact.",
    where_stopped: "Newer stopping point.",
    next_action: "Write claim two.",
    do_not_rethink: "Do not widen the scope.",
    created_at: "2026-05-10T10:00:00.000Z",
  },
];

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/missions/mission-1"]}>
      <Routes>
        <Route path="/missions/:missionId" element={<MissionSnapshotPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MissionSnapshotPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.mission).mockResolvedValue(mission);
    vi.mocked(api.checkpoints).mockResolvedValue(checkpoints);
    vi.mocked(api.domains).mockResolvedValue([]);
    vi.mocked(api.updateMission).mockImplementation(async (_id, payload) => ({ ...mission, ...payload }));
  });

  it("renders editable snapshot fields and checkpoint history newest first", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Finish anomaly detection direction" })).toBeInTheDocument();
    expect(screen.getByText("It clarifies the paper.")).toBeInTheDocument();
    expect(screen.getByText("Three contribution claims drafted.")).toBeInTheDocument();

    const newer = screen.getByText("Newer stopping point.");
    const older = screen.getByText("Older stopping point.");
    expect(newer.compareDocumentPosition(older) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("saves inline edits on blur", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "It clarifies the paper." }));
    const editor = screen.getByRole("textbox", { name: "Why this matters" });
    await user.clear(editor);
    await user.type(editor, "It makes the next draft easier.");
    await user.tab();

    await waitFor(() => {
      expect(api.updateMission).toHaveBeenCalledWith("mission-1", { why_matters: "It makes the next draft easier." });
    });
    expect(await screen.findByRole("button", { name: "It makes the next draft easier." })).toBeInTheDocument();
  });

  it("expands checkpoint details without editing history", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("Newer stopping point.");
    await user.click(screen.getAllByRole("button", { name: /Details/i })[0]);

    expect(screen.getByText("Drafted the first claim.")).toBeInTheDocument();
    expect(screen.getByText("Lead with application impact.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
  });
});
