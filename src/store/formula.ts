import { create } from 'zustand';
import type { MacroMap } from '@/lib/latex';

export interface FormulaRequest {
  latex: string;
  display: boolean;
  macros: MacroMap;
  macrosKey: string;
  source?: string;
}

interface FormulaStore {
  current: FormulaRequest | null;
  open: (request: FormulaRequest) => void;
  close: () => void;
}

export const useFormula = create<FormulaStore>((set) => ({
  current: null,
  open: (request) => set({ current: request }),
  close: () => set({ current: null }),
}));
