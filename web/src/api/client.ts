import type {
  CalendarStatus,
  CalendarSyncResult,
  Checkpoint,
  CheckpointPayload,
  CheckpointSaved,
  CompilePayload,
  Domain,
  Item,
  ItemState,
  ItemUpdatePayload,
  LoginResult,
  Providers,
  Snapshot,
  SnapshotPayload,
  Tab,
  TwoFactorSetup,
  TwoFactorStatus,
  User,
} from "../types";

// `||` (not `??`): a build with the env var unset bakes an empty string,
// which must also fall back to the default, not produce relative URLs.
const BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) || "http://localhost:8000/api";

export const TOKEN_KEY = "checkpoint_token";

let authToken: string | null =
  typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

export function setToken(token: string | null): void {
  authToken = token;
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return authToken;
}

// Refresh the in-memory token from localStorage WITHOUT writing it back. Used
// when another tab changes the token, so we adopt its session without firing a
// redundant storage event.
export function syncToken(): string | null {
  authToken = typeof localStorage !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  return authToken;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

  const res = await fetch(BASE + path, { ...options, headers });
  if (!res.ok) {
    let detail: string = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") detail = body.detail;
      else if (body?.detail) detail = JSON.stringify(body.detail);
    } catch {
      /* ignore */
    }
    if (res.status === 401) setToken(null);
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const body = (data: unknown): RequestInit => ({ body: JSON.stringify(data) });

// ----- auth -----
export const register = (email: string, password: string) =>
  request<User>("/auth/register", { method: "POST", ...body({ email, password }) });

export const login = (email: string, password: string) =>
  request<LoginResult>("/auth/login", {
    method: "POST",
    ...body({ email, password }),
  });

export const googleLogin = (credential: string) =>
  request<LoginResult>("/auth/google", {
    method: "POST",
    ...body({ credential }),
  });

// Second leg of a 2FA login: exchange the mfa_token + a TOTP/recovery code for
// a real session token.
export const completeLoginMfa = (mfaToken: string, code: string) =>
  request<LoginResult>("/auth/login/2fa", {
    method: "POST",
    ...body({ mfa_token: mfaToken, code }),
  });

// ----- two-factor (TOTP) -----
export const getTwoFactorStatus = () => request<TwoFactorStatus>("/auth/2fa");

export const setupTwoFactor = () =>
  request<TwoFactorSetup>("/auth/2fa/setup", { method: "POST" });

export const enableTwoFactor = (
  code: string,
  requireForLogin: boolean,
  requireForDelete: boolean,
) =>
  request<{ recovery_codes: string[] }>("/auth/2fa/enable", {
    method: "POST",
    ...body({
      code,
      require_for_login: requireForLogin,
      require_for_delete: requireForDelete,
    }),
  });

export const updateTwoFactorScopes = (
  requireForLogin: boolean,
  requireForDelete: boolean,
) =>
  request<TwoFactorStatus>("/auth/2fa", {
    method: "PATCH",
    ...body({ require_for_login: requireForLogin, require_for_delete: requireForDelete }),
  });

export const disableTwoFactor = (code: string) =>
  request<void>("/auth/2fa/disable", { method: "POST", ...body({ code }) });

export const regenerateRecoveryCodes = (code: string) =>
  request<{ recovery_codes: string[] }>("/auth/2fa/recovery-codes", {
    method: "POST",
    ...body({ code }),
  });

export const getProviders = () => request<Providers>("/auth/providers");

export const me = () => request<User>("/auth/me");

// Set (Google-only account) or change the local password.
export const setPassword = (password: string, currentPassword?: string) =>
  request<void>("/auth/password", {
    method: "POST",
    ...body({ password, current_password: currentPassword }),
  });

export const markSeenVersion = (version: string) =>
  request<void>("/auth/seen", { method: "POST", ...body({ version }) });

// Permanently delete the signed-in account and all of its data. `password` is
// required for accounts that have one (re-auth guard); Google-only accounts omit
// it. `code` is a TOTP / recovery code, required when 2FA gates deletion.
export const deleteAccount = (password?: string, code?: string) =>
  request<void>("/auth/me", { method: "DELETE", ...body({ password, code }) });

// ----- domains -----
export const listDomains = () => request<Domain[]>("/domains");

export const createDomain = (name: string) =>
  request<Domain>("/domains", { method: "POST", ...body({ name }) });

// ----- items -----
// The IANA zone of this browser, so the server computes the Today/Ready date
// windows against the user's local day rather than UTC.
function localTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export function listItems(tab: Tab, domain?: string) {
  const params = new URLSearchParams({ tab });
  if (domain) params.set("domain", domain);
  const tz = localTimeZone();
  if (tz) params.set("tz", tz);
  return request<Item[]>(`/items?${params.toString()}`);
}

export const getItem = (id: string) => request<Item>(`/items/${id}`);

export const captureItem = (text: string, domain?: string) =>
  request<Item>("/items/capture", { method: "POST", ...body({ text, domain }) });

export const promoteItem = (id: string, domain: string) =>
  request<Item>(`/items/${id}/promote`, { method: "POST", ...body({ domain }) });

export const compileItem = (id: string, payload: CompilePayload) =>
  request<Item>(`/items/${id}/compile`, { method: "POST", ...body(payload) });

export const updateItem = (id: string, payload: ItemUpdatePayload) =>
  request<Item>(`/items/${id}`, { method: "PATCH", ...body(payload) });

export const setItemState = (id: string, state: ItemState) =>
  request<Item>(`/items/${id}/state`, { method: "POST", ...body({ state }) });

export const setItemDaily = (id: string, daily: boolean) =>
  request<Item>(`/items/${id}/daily`, { method: "POST", ...body({ daily }) });

export const deleteItem = (id: string) =>
  request<Item>(`/items/${id}`, { method: "DELETE" });

// ----- trash -----
export const restoreItem = (id: string) =>
  request<Item>(`/items/${id}/restore`, { method: "POST" });

export const permanentlyDeleteItem = (id: string) =>
  request<void>(`/items/${id}/permanent`, { method: "DELETE" });

export const emptyTrash = () =>
  request<void>("/items/trash/empty", { method: "DELETE" });

// ----- integrations: google calendar -----
export const getCalendarStatus = () =>
  request<CalendarStatus>("/integrations/google-calendar");

export const connectCalendar = (code: string, redirectUri = "postmessage") =>
  request<CalendarStatus>("/integrations/google-calendar/connect", {
    method: "POST",
    ...body({ code, redirect_uri: redirectUri }),
  });

export const syncCalendar = () =>
  request<CalendarSyncResult>("/integrations/google-calendar/sync", { method: "POST" });

export const disconnectCalendar = (keepEvents = true) =>
  request<void>(`/integrations/google-calendar?keep_events=${keepEvents}`, {
    method: "DELETE",
  });

// ----- checkpoints -----
export const listCheckpoints = (id: string) =>
  request<Checkpoint[]>(`/items/${id}/checkpoints`);

export const createCheckpoint = (id: string, payload: CheckpointPayload) =>
  request<CheckpointSaved>(`/items/${id}/checkpoints`, { method: "POST", ...body(payload) });

// ----- snapshots -----
export const listSnapshots = (id: string) =>
  request<Snapshot[]>(`/items/${id}/snapshots`);

export const createSnapshot = (id: string, payload: SnapshotPayload) =>
  request<Snapshot>(`/items/${id}/snapshots`, { method: "POST", ...body(payload) });

export const updateSnapshot = (id: string, snapshotId: string, payload: SnapshotPayload) =>
  request<Snapshot>(`/items/${id}/snapshots/${snapshotId}`, { method: "PATCH", ...body(payload) });

export const deleteSnapshot = (id: string, snapshotId: string) =>
  request<void>(`/items/${id}/snapshots/${snapshotId}`, { method: "DELETE" });
