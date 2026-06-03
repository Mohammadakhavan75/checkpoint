import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../lib/api";
import type { Mission, ParkingItem } from "../lib/types";
import { LifeIndexPage } from "./LifeIndexPage";

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {
    status = 500;
  },
  api: {
    missions: vi.fn(),
    parkingItems: vi.fn(),
    domains: vi.fn(),
    createMission: vi.fn(),
    activateMission: vi.fn(),
    promoteMission: vi.fn(),
    parkMission: vi.fn(),
    deleteMission: vi.fn(),
  },
}));

const parkingItem: ParkingItem = {
  id: "parking-1",
  title: "Compare note tools later",
  note: "Not today. Markdown is enough.",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function missionFixture(overrides: Partial<Mission> = {}): Mission {
  const now = new Date().toISOString();
  return {
    id: "mission-1",
    domain_id: null,
    parent_id: null,
    title: "Top level mission",
    status: "active",
    active_rank: 1,
    mission_kind: "standard",
    activation_energy: "medium",
    cognitive_load: "medium",
    emotional_resistance: "medium",
    novelty: "medium",
    est_minutes: 15,
    reward_type: "momentum",
    why_matters: "",
    success_condition: "",
    current_state: "",
    last_decision: "",
    blockers: "",
    files_links: "",
    reentry_note: "",
    next_action: "Open the top-level work",
    do_not_rethink: "",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LifeIndexPage />
    </MemoryRouter>,
  );
}

describe("LifeIndexPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.missions).mockResolvedValue([]);
    vi.mocked(api.parkingItems).mockResolvedValue([]);
    vi.mocked(api.domains).mockResolvedValue([]);
  });

  it("shows parking count pill when there are parking items", async () => {
    vi.mocked(api.parkingItems).mockResolvedValue([parkingItem]);
    renderPage();

    expect(await screen.findByText(/1 parked/)).toBeInTheDocument();
  });

  it("shows empty parking message when nothing is parked", async () => {
    renderPage();

    expect(await screen.findByText(/Nothing parked yet/)).toBeInTheDocument();
  });

  it("shows empty primary message when no active missions", async () => {
    renderPage();

    expect(await screen.findByText(/Nothing active yet/)).toBeInTheDocument();
  });

  it("does not show child micro-missions in the main index", async () => {
    vi.mocked(api.missions).mockResolvedValue([
      missionFixture(),
      missionFixture({ id: "micro-1", parent_id: "mission-1", title: "Tiny child move", active_rank: null, est_minutes: 2 }),
    ]);
    renderPage();

    expect(await screen.findByText("Top level mission")).toBeInTheDocument();
    expect(screen.queryByText("Tiny child move")).not.toBeInTheDocument();
  });
});
