import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TodayPage } from "./TodayPage";
import type { TodayPayload } from "../lib/types";

const apiMock = vi.hoisted(() => ({
  today: vi.fn(),
  setTodayState: vi.fn(),
  startToday: vi.fn(),
}));

vi.mock("../lib/api", () => ({
  ApiError: class ApiError extends Error {
    status = 500;
  },
  api: apiMock,
}));

function todayPayload(overrides: Partial<TodayPayload> = {}): TodayPayload {
  const now = new Date().toISOString();
  return {
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
      created_at: now,
      updated_at: now,
    },
    last_checkpoint: {
      id: "checkpoint-1",
      mission_id: "mission-1",
      changed: "Novelty framing is weak; compare three contribution angles.",
      decision: "",
      where_stopped: "Novelty framing is weak; compare three contribution angles.",
      next_action: "Open notes.md and write three possible contribution claims.",
      do_not_rethink: "Do not revisit the tooling choice today.",
      created_at: now,
    },
    active_count: 1,
    parking_count: 7,
    preferences: { nav_collapsed: true, active_limit: 1 },
    director: {
      current_state: null,
      recovery_due: false,
      entry_move: "Open notes.md and write three possible contribution claims.",
      fallback_move: "Make it smaller: open the work surface and touch only the first visible step.",
      reward_hint: "Pick your state. The app will shrink the first move.",
      recommended_mode: "check_in",
      latest_reward: null,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.today.mockResolvedValue(todayPayload());
  apiMock.setTodayState.mockResolvedValue({ state: "Avoiding" });
  apiMock.startToday.mockResolvedValue({
    id: "reward-1",
    user_id: "user-1",
    mission_id: "mission-1",
    kind: "started",
    message: "You broke avoidance. Momentum restored.",
    created_at: new Date().toISOString(),
  });
});

describe("TodayPage", () => {
  it("starts with state check-in and hides mission context", async () => {
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("State first")).toBeInTheDocument();
    expect(screen.getByText("What state are you in?")).toBeInTheDocument();
    expect(screen.queryByText("Finish anomaly detection direction")).not.toBeInTheDocument();
  });

  it("shows a reduced low-state director surface before mission details", async () => {
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole("button", { name: /Avoiding/i }));

    expect(await screen.findByText("One tiny move")).toBeInTheDocument();
    expect(screen.getByText("Open notes.md and write three possible contribution claims.")).toBeInTheDocument();
    expect(screen.queryByText("Finish anomaly detection direction")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /show mission context/i }));
    expect(screen.getByText("Finish anomaly detection direction")).toBeInTheDocument();
  });

  it("shows familiar resume context for locked-in state and rewards resume", async () => {
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole("button", { name: /Locked in/i }));

    expect(await screen.findByText("Start ritual")).toBeInTheDocument();
    expect(screen.getByText("Finish anomaly detection direction")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Resume/i }));
    expect(await screen.findByText("You broke avoidance. Momentum restored.")).toBeInTheDocument();
    expect(apiMock.startToday).toHaveBeenCalledWith({
      mission_id: "mission-1",
      state: "Locked in",
      action_text: "Open notes.md and write three possible contribution claims.",
    });
  });

  it("surfaces recovery mode after old activity and rewards return", async () => {
    apiMock.today.mockResolvedValueOnce(
      todayPayload({
        director: {
          current_state: null,
          recovery_due: true,
          entry_move: "Open notes.md and write three possible contribution claims.",
          fallback_move: "Make it smaller: open the work surface and touch only the first visible step.",
          reward_hint: "Return counts. Resilience restored.",
          recommended_mode: "recovery",
          latest_reward: null,
        },
      }),
    );
    apiMock.startToday.mockResolvedValueOnce({
      id: "reward-2",
      user_id: "user-1",
      mission_id: "mission-1",
      kind: "returned_after_gap",
      message: "Return counts. Resilience restored.",
      created_at: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText("Return mode")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Recovering/i }));

    expect(await screen.findByText("Recovery move")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Start this move/i }));
    expect(await screen.findByText("Return counts. Resilience restored.")).toBeInTheDocument();
  });
});
