import { api } from "../api/client";
import type { PatientRow } from "../api/types";
import { usePart6Patient } from "../store/patientStore";
import { useApi } from "./useApi";

/** Patients visible to the current user, optionally limited to certain relations; `current` is derived, not effect-synced. */
export function usePatients(relations?: PatientRow["relation"][]) {
  const list = useApi(() => api.get<{ patients: PatientRow[] }>("/patients"), []);
  const selectedId = usePart6Patient((s) => s.patientId);
  const select = usePart6Patient((s) => s.select);
  const rows = (list.data?.patients ?? []).filter((p) => !relations || relations.includes(p.relation));
  const current = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;
  return { ...list, rows, current, select };
}
