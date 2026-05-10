import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../lib/api";
import type { ParkingItem } from "../lib/types";
import { LifeIndexPage } from "./LifeIndexPage";

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {
    status = 500;
  },
  api: {
    missions: vi.fn(),
    parkingItems: vi.fn(),
    createMission: vi.fn(),
    activateMission: vi.fn(),
    parkMission: vi.fn(),
  },
}));

const parkingItem: ParkingItem = {
  id: "parking-1",
  title: "Compare note tools later",
  note: "Not today. Markdown is enough.",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("LifeIndexPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.missions).mockResolvedValue([]);
    vi.mocked(api.parkingItems).mockResolvedValue([parkingItem]);
  });

  it("shows standalone parking items in the parking section", async () => {
    render(<LifeIndexPage />);

    expect(await screen.findByText("Compare note tools later")).toBeInTheDocument();
    expect(screen.getByText("Not today. Markdown is enough.")).toBeInTheDocument();
    expect(screen.queryByText("Nothing parked yet.")).not.toBeInTheDocument();
  });
});
