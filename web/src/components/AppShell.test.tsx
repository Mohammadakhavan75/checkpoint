import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./AppShell";
import { AuthProvider } from "../lib/auth";
import { ThemeProvider } from "../lib/theme";
import { api } from "../lib/api";

vi.mock("../lib/api", async () => {
  return {
    api: {
      me: vi.fn().mockResolvedValue({
        user: { id: "user-1", email: "alex@example.com", created_at: new Date().toISOString() },
        preferences: { nav_collapsed: true, active_limit: 1 },
      }),
      updatePreferences: vi.fn().mockResolvedValue({ nav_collapsed: false, active_limit: 1 }),
      logout: vi.fn().mockResolvedValue({ ok: true }),
    },
  };
});

describe("AppShell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a compact rail and persists expansion", async () => {
    render(
      <MemoryRouter initialEntries={["/today"]}>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<AppShell />}>
                <Route path="today" element={<div>Today content</div>} />
              </Route>
            </Routes>
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Today content")).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /expand side panel/i });
    await userEvent.click(toggle);
    expect(api.updatePreferences).toHaveBeenCalledWith({ nav_collapsed: false });
  });
});
