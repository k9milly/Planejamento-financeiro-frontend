import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { YEAR } from "@/lib/finance-data";

interface PeriodValue {
  month: number; // 0 = ano inteiro
  year: number;
  setMonth: (m: number) => void;
  setYear: (y: number) => void;
}

const PeriodContext = createContext<PeriodValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(8);
  const [year, setYear] = useState(YEAR);
  const value = useMemo(() => ({ month, year, setMonth, setYear }), [month, year]);
  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>;
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod deve ser usado dentro de PeriodProvider");
  return ctx;
}
