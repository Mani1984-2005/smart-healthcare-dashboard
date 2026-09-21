import { create } from "zustand";

// The patient currently selected inside Part 6 (independent of any other module's patient store).
interface SelState {
  patientId: string | null;
  select: (id: string | null) => void;
}
export const usePart6Patient = create<SelState>((set) => ({ patientId: null, select: (patientId) => set({ patientId }) }));
