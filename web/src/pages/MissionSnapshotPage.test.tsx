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
    microMissions: vi.fn(),
    checkpoints: vi.fn(),
    domains: vi.fn(),
    updateMission: vi.fn(),
    createMicroMission: vi.fn(),
    completeMission: vi.fn(),
  },
}));

const mission: Mission = {
  id: "mission-1",
  domain_id: null,
  title: "Finish anomaly detection direction",
  status: "active",
  active_rank: 1,
  parent_id: null,
  mission_kind: "standard",
  activation_energy: "medium",
  cognitive_load: "medium",
  emotional_resistance: "medium",
  novelty: "medium",
  est_minutes: 15,
  reward_type: "momentum",
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

const microMission: Mission = {
  ...mission,
  id: "micro-1",
  parent_id: "mission-1",
  title: "Open notes for two minutes",
  active_rank: null,
  mission_kind: "momentum",
  activation_energy: "low",
  cognitive_load: "low",
  emotional_resistance: "low",
  est_minutes: 2,
  next_action: "Open notes.md",
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
    vi.mocked(api.microMissions).mockResolvedValue([microMission]);
    vi.mocked(api.checkpoints).mockResolvedValue(checkpoints);
    vi.mocked(api.domains).mockResolvedValue([]);
    vi.mocked(api.updateMission).mockImplementation(async (_id, payload) => ({ ...mission, ...payload }));
    vi.mocked(api.createMicroMission).mockImplementation(async (_id, payload) => ({ ...microMission, id: "micro-2", ...payload }));
    vi.mocked(api.completeMission).mockResolvedValue({
      id: "reward-1",
      user_id: "user-1",
      mission_id: "micro-1",
      kind: "completed",
      message: "Tiny move complete. Momentum banked.",
      momentum_delta: 2,
      clarity_delta: 0,
      resilience_delta: 0,
      reason: "Tiny move completed",
      created_at: new Date().toISOString(),
    });
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

  it("creates and completes tiny moves", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByText("Tiny moves")).toBeInTheDocument();
    expect(screen.getByText("Open notes for two minutes")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Tiny move"), "Write one rough bullet");
    await user.type(screen.getByLabelText("Action"), "Open notes.md and write one rough bullet");
    await user.click(screen.getByRole("button", { name: /Create tiny move/i }));

    await waitFor(() => {
      expect(api.createMicroMission).toHaveBeenCalledWith("mission-1", expect.objectContaining({ title: "Write one rough bullet" }));
    });
    expect(await screen.findByText("Write one rough bullet")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "Complete" })[0]);
    await waitFor(() => {
      expect(api.completeMission).toHaveBeenCalledWith("micro-2", "Tiny move completed");
    });
  });
});
