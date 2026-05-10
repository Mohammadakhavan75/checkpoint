import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../lib/api";
import type { Mission, ParkingItem } from "../lib/types";
import { ParkingPage } from "./ParkingPage";

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {
    status = 500;
  },
  api: {
    parkingItems: vi.fn(),
    missions: vi.fn(),
    createParkingItem: vi.fn(),
    deleteParkingItem: vi.fn(),
    activateMission: vi.fn(),
  },
}));

const parkedMission: Mission = {
  id: "mission-1",
  domain_id: null,
  title: "Prepare leadership roadmap",
  status: "parked",
  active_rank: null,
  why_matters: "",
  success_condition: "",
  current_state: "",
  last_decision: "",
  blockers: "",
  files_links: "",
  reentry_note: "",
  next_action: "Open roadmap.md and write the first section.",
  do_not_rethink: "",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const parkingItem: ParkingItem = {
  id: "parking-1",
  title: "Compare note tools later",
  note: "Not today. Markdown is enough.",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("ParkingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.parkingItems).mockResolvedValue([parkingItem]);
    vi.mocked(api.missions).mockResolvedValue([parkedMission]);
  });

  it("shows parked missions alongside standalone parking items", async () => {
    render(<ParkingPage />);

    expect(await screen.findByText("Prepare leadership roadmap")).toBeInTheDocument();
    expect(screen.getByText("Open roadmap.md and write the first section.")).toBeInTheDocument();
    expect(screen.getByText("Compare note tools later")).toBeInTheDocument();
    expect(api.missions).toHaveBeenCalledWith("parked");
  });
});
