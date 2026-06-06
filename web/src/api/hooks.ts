import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CheckpointPayload,
  CompilePayload,
  ItemState,
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

function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["items"] });
    qc.invalidateQueries({ queryKey: ["item"] });
    qc.invalidateQueries({ queryKey: ["checkpoints"] });
  };
}

export function useCapture() {
  const invalidate = useInvalidateAll();
  return useMutation({ mutationFn: (text: string) => api.captureItem(text), onSuccess: invalidate });
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

export function useSaveCheckpoint() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (vars: { id: string; payload: CheckpointPayload }) =>
      api.createCheckpoint(vars.id, vars.payload),
    onSuccess: invalidate,
  });
}
