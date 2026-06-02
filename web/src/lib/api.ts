import type { Checkpoint, Domain, Mission, ParkingItem, Preferences, TodayPayload, User } from "./types";

const DOMAIN_NAME = import.meta.env.VITE_DOMAIN_NAME || "infiniteai.space";
const API_BASE = import.meta.env.VITE_API_BASE_URL || `http://api.${DOMAIN_NAME}:8000`;

type RequestOptions = RequestInit & {
  json?: unknown;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: "include",
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });
  if (response.status === 204) {
    return undefined as T;
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body.detail === "string" ? body.detail : "Request failed";
    throw new ApiError(response.status, message);
  }
  return body as T;
}

export type AuthPayload = {
  user: User;
  preferences: Preferences;
};

export const api = {
  signup: (email: string, password: string) => request<AuthPayload>("/api/auth/signup", { method: "POST", json: { email, password } }),
  login: (email: string, password: string) => request<AuthPayload>("/api/auth/login", { method: "POST", json: { email, password } }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => request<AuthPayload>("/api/auth/me"),
  preferences: () => request<Preferences>("/api/preferences"),
  updatePreferences: (payload: Partial<Preferences>) => request<Preferences>("/api/preferences", { method: "PATCH", json: payload }),
  today: () => request<TodayPayload>("/api/today"),
  domains: () => request<Domain[]>("/api/domains"),
  createDomain: (name: string) => request<Domain>("/api/domains", { method: "POST", json: { name } }),
  updateDomain: (id: string, name: string) => request<Domain>(`/api/domains/${id}`, { method: "PATCH", json: { name } }),
  deleteDomain: (id: string) => request<void>(`/api/domains/${id}`, { method: "DELETE" }),
  mission: (id: string) => request<Mission>(`/api/missions/${id}`),
  missions: (status?: Mission["status"]) => request<Mission[]>(status ? `/api/missions?status=${status}` : "/api/missions"),
  createMission: (payload: Partial<Mission> & Pick<Mission, "title">) => request<Mission>("/api/missions", { method: "POST", json: payload }),
  updateMission: (id: string, payload: Partial<Mission>) => request<Mission>(`/api/missions/${id}`, { method: "PATCH", json: payload }),
  activateMission: (id: string) => request<Mission>(`/api/missions/${id}/activate`, { method: "POST" }),
  promoteMission: (id: string) => request<Mission>(`/api/missions/${id}/promote`, { method: "POST" }),
  demoteMission: (id: string) => request<Mission>(`/api/missions/${id}/demote`, { method: "POST" }),
  parkMission: (id: string) => request<Mission>(`/api/missions/${id}/park`, { method: "POST" }),
  deleteMission: (id: string) => request<void>(`/api/missions/${id}`, { method: "DELETE" }),
  checkpoints: (missionId: string) => request<Checkpoint[]>(`/api/missions/${missionId}/checkpoints`),
  createCheckpoint: (missionId: string, payload: Pick<Checkpoint, "changed" | "decision" | "where_stopped" | "next_action" | "do_not_rethink">) =>
    request<Checkpoint>(`/api/missions/${missionId}/checkpoints`, { method: "POST", json: payload }),
  parkingItems: () => request<ParkingItem[]>("/api/parking-items"),
  createParkingItem: (title: string, note: string) => request<ParkingItem>("/api/parking-items", { method: "POST", json: { title, note } }),
  updateParkingItem: (id: string, payload: Partial<ParkingItem>) => request<ParkingItem>(`/api/parking-items/${id}`, { method: "PATCH", json: payload }),
  deleteParkingItem: (id: string) => request<void>(`/api/parking-items/${id}`, { method: "DELETE" }),
};
