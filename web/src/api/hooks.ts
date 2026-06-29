import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CheckpointPayload,
  CompilePayload,
  ItemState,
  ItemUpdatePayload,
  SnapshotPayload,
  Tab,
} from "../types";
import * as api from "./client";

export function useItems(tab: Tab, domain?: string) {
  return useQuery({
    queryKey: ["items", tab, domain ?? null],
    queryFn: () => api.listItems(tab, domain),
    enabled: tab !== "domain" || !!domain,
  });
}

export function useItem(id: string | null) {
  return useQuery({
    queryKey: ["item", id],
    queryFn: () => api.getItem(id as string),
    enabled: !!id,
  });
}

export function useCheckpoints(id: string | null) {
  return useQuery({
    queryKey: ["checkpoints", id],
    queryFn: () => api.listCheckpoints(id as string),
    enabled: !!id,
  });
}

export function useSnapshots(id: string | null) {
  return useQuery({
    queryKey: ["snapshots", id],
    queryFn: () => api.listSnapshots(id as string),
    enabled: !!id,
  });
}

export function useDomains() {
  return useQuery({ queryKey: ["domains"], queryFn: api.listDomains });
}

export function useProviders() {
  return useQuery({ queryKey: ["providers"], queryFn: api.getProviders, staleTime: Infinity });
}

export function useCalendarStatus(enabled = true) {
  return useQuery({ queryKey: ["calendar"], queryFn: api.getCalendarStatus, enabled });
}

export function useConnectCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => api.connectCalendar(code),
    onSuccess: (data) => {
      qc.setQueryData(["calendar"], data);
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useSyncCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.syncCalendar(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

export function useDisconnectCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keepEvents: boolean) => api.disconnectCalendar(keepEvents),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar"] });
      qc.invalidateQueries({ queryKey: ["items"] });
    },
  });
}

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["item"] });
    qc.invalidateQueries({ queryKey: ["checkpoints"] });
    qc.invalidateQueries({ queryKey: ["domains"] });
  };
}

export function useCreateDomain() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (name: string) => api.createDomain(name), onSuccess: invalidate });
}

export function useCapture() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: string | { text: string; domain?: string }) =>
      typeof vars === "string"
        ? api.captureItem(vars)
        : api.captureItem(vars.text, vars.domain),
    onSuccess: invalidate,
  });
}

export function usePromote() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: string; domain: string }) => api.promoteItem(vars.id, vars.domain),
    onSuccess: invalidate,
  });
}

export function useCompile() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: string; payload: CompilePayload }) =>
      api.compileItem(vars.id, vars.payload),
    onSuccess: invalidate,
  });
}

export function useUpdateItem() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: string; payload: ItemUpdatePayload }) =>
      api.updateItem(vars.id, vars.payload),
    onSuccess: invalidate,
  });
}

export function useSetState() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: string; state: ItemState }) => api.setItemState(vars.id, vars.state),
    onSuccess: invalidate,
  });
}

export function useSetDaily() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: string; daily: boolean }) => api.setItemDaily(vars.id, vars.daily),
    onSuccess: invalidate,
  });
}

export function useDeleteItem() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => api.deleteItem(id), onSuccess: invalidate });
}

export function useRestoreItem() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (id: string) => api.restoreItem(id), onSuccess: invalidate });
}

export function usePermanentlyDeleteItem() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => api.permanentlyDeleteItem(id),
    onSuccess: invalidate,
  });
}

export function useEmptyTrash() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: () => api.emptyTrash(), onSuccess: invalidate });
}

export function useSaveCheckpoint() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: string; payload: CheckpointPayload }) =>
      api.createCheckpoint(vars.id, vars.payload),
    onSuccess: invalidate,
  });
}

export function useSaveSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; payload: SnapshotPayload }) =>
      api.createSnapshot(vars.id, vars.payload),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["snapshots", vars.id] }),
  });
}

export function useUpdateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; snapshotId: string; payload: SnapshotPayload }) =>
      api.updateSnapshot(vars.id, vars.snapshotId, vars.payload),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["snapshots", vars.id] }),
  });
}

export function useDeleteSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; snapshotId: string }) =>
      api.deleteSnapshot(vars.id, vars.snapshotId),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["snapshots", vars.id] }),
  });
}

// ----- reminders & web push (ADR-001) -----
export function useSettings(enabled = true) {
  return useQuery({ queryKey: ["settings"], queryFn: api.getSettings, enabled });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Parameters<typeof api.updateSettings>[0]) => api.updateSettings(patch),
    onSuccess: (data) => qc.setQueryData(["settings"], data),
  });
}

export function usePushDevices(enabled = true) {
  return useQuery({ queryKey: ["push-devices"], queryFn: api.listPushDevices, enabled });
}

export function useDeletePushDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deletePushDevice(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["push-devices"] }),
  });
}

export function useReminders(itemId: string | null) {
  return useQuery({
    queryKey: ["reminders", itemId],
    queryFn: () => api.listReminders(itemId as string),
    enabled: !!itemId,
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { itemId: string; fireAt: string }) =>
      api.createReminder(vars.itemId, vars.fireAt),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["reminders", vars.itemId] }),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; itemId: string }) => api.deleteReminder(vars.id),
    onSuccess: (_data, vars) =>
      qc.invalidateQueries({ queryKey: ["reminders", vars.itemId] }),
  });
}
