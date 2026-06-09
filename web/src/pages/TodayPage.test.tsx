import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { TodayPage } from "./TodayPage";

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {
    status = 500;
  },
  api: {
    today: vi.fn().mockResolvedValue({
      primary_mission: {
        id: "mission-1",
        title: "Finish anomaly detection direction",
        status: "active",
        domain_id: null,
        active_rank: 1,
        why_matters: "It clarifies the paper.",
        success_condition: "Three contribution claims drafted.",
        current_state: "",
        last_decision: "",
        blockers: "",
        files_links: "",
        reentry_note: "",
        next_action: "Open notes.md and write three possible contribution claims.",
        do_not_rethink: "Do not revisit the tooling choice today.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      last_checkpoint: {
        id: "checkpoint-1",
        mission_id: "mission-1",
        changed: "Novelty framing is weak; compare three contribution angles.",
        decision: "",
        where_stopped: "Novelty framing is weak; compare three contribution angles.",
        next_action: "Open notes.md and write three possible contribution claims.",
        do_not_rethink: "Do not revisit the tooling choice today.",
        created_at: new Date().toISOString(),
      },
      active_count: 1,
      parking_count: 7,
      preferences: { nav_collapsed: true, active_limit: 1 },
    }),
  },
}));

describe("TodayPage", () => {
  it("renders the minimal start ritual and reveals details only on demand", async () => {
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Start ritual")).toBeInTheDocument();
    expect(screen.getByText("Finish anomaly detection direction")).toBeInTheDocument();
    expect(screen.getByText("Open notes.md and write three possible contribution claims.")).toBeInTheDocument();
    expect(screen.queryByText("Mission snapshot")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /show more/i }));
    expect(screen.getByText("Mission snapshot")).toBeInTheDocument();
  });
});
