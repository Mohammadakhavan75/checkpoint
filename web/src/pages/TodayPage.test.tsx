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
        parent_id: null,
        active_rank: 1,
        mission_kind: "standard",
        activation_energy: "medium",
        cognitive_load: "medium",
        emotional_resistance: "medium",
        novelty: "medium",
        est_minutes: 15,
        reward_type: "momentum",
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
      momentum: 4,
      resilience: 2,
      recommended_micro_mission: null,
      active_session: null,
      session_stale: false,
    },
    ...overrides,
  };
}

function microMission() {
  const now = new Date().toISOString();
  return {
    id: "micro-1",
    title: "Collect three rough bullets",
    status: "active" as const,
    domain_id: null,
    parent_id: "mission-1",
    active_rank: null,
    mission_kind: "momentum" as const,
    activation_energy: "low" as const,
    cognitive_load: "low" as const,
    emotional_resistance: "low" as const,
    novelty: "medium" as const,
    est_minutes: 3,
    reward_type: "momentum" as const,
    why_matters: "",
    success_condition: "",
    current_state: "",
    last_decision: "",
    blockers: "",
    files_links: "",
    reentry_note: "",
    next_action: "Open scary.md and write rough bullets",
    do_not_rethink: "",
    created_at: now,
    updated_at: now,
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
    momentum_delta: 1,
    clarity_delta: 0,
    resilience_delta: 0,
    reason: "Open notes.md and write three possible contribution claims.",
    created_at: new Date().toISOString(),
    session: null,
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
    expect(screen.getByText("Momentum 4")).toBeInTheDocument();
    expect(screen.getByText("Resilience 2")).toBeInTheDocument();
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

  it("uses the recommended micro-mission as the start target", async () => {
    apiMock.today.mockResolvedValueOnce(
      todayPayload({
        director: {
          current_state: null,
          recovery_due: false,
          entry_move: "Open scary.md and write rough bullets",
          fallback_move: "Make it smaller: open the work surface and touch only the first visible step.",
          reward_hint: "Pick your state. The app will shrink the first move.",
          recommended_mode: "check_in",
          latest_reward: null,
          momentum: 1,
          resilience: 0,
          recommended_micro_mission: microMission(),
          active_session: null,
          session_stale: false,
        },
      }),
    );
    render(
      <MemoryRouter>
        <TodayPage />
      </MemoryRouter>,
    );

    await userEvent.click(await screen.findByRole("button", { name: /Avoiding/i }));
    expect(await screen.findByText("Open scary.md and write rough bullets")).toBeInTheDocument();
    expect(screen.getByText("From Finish anomaly detection direction")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Start this move/i }));
    expect(apiMock.startToday).toHaveBeenCalledWith({
      mission_id: "micro-1",
      state: "Avoiding",
      action_text: "Open scary.md and write rough bullets",
    });
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
          momentum: 0,
          resilience: 1,
          recommended_micro_mission: null,
          active_session: null,
          session_stale: false,
        },
      }),
    );
    apiMock.startToday.mockResolvedValueOnce({
      id: "reward-2",
      user_id: "user-1",
      mission_id: "mission-1",
      kind: "returned_after_gap",
      message: "Return counts. Resilience restored.",
      momentum_delta: 0,
      clarity_delta: 0,
      resilience_delta: 2,
      reason: "Open notes.md and write three possible contribution claims.",
      created_at: new Date().toISOString(),
      session: null,
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
