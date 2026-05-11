import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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
});
