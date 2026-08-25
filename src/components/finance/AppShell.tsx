import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarClock,
  Heart,
  LayoutDashboard,
  ReceiptText,
  Table2,
  Target,
  Settings,
  Wallet,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { MONTHS, YEAR } from "@/lib/finance-data";
import { usePeriod } from "./period-context";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/lancamentos", label: "Lançamentos", icon: ReceiptText },
  { to: "/gastos-fixos", label: "Gastos Fixos", icon: CalendarClock },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/tabela-dinamica", label: "Tabela Dinâmica", icon: Table2 },
  { to: "/metas", label: "Metas & Orçamentos", icon: Target },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

function PeriodFilter() {
  const { month, year, setMonth, setYear } = usePeriod();
  const selectCls =
    "h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="Mês"
        className={selectCls}
        value={month}
        onChange={(e) => setMonth(Number(e.target.value))}
      >
        <option value={0}>Ano inteiro</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        aria-label="Ano"
        className={selectCls}
        value={year}
        onChange={(e) => setYear(Number(e.target.value))}
      >
        {[YEAR - 1, YEAR].map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-8 border-r border-sidebar-border bg-sidebar p-5 lg:flex">
        <Brand />
        {nav}
        <div className="mt-auto panel p-4">
          <p className="text-xs text-muted-foreground">Dica</p>
          <p className="mt-1 text-sm">
            Mantenha a taxa de poupança acima de 20% para acelerar suas metas.
          </p>
        </div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/80" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-sidebar-border bg-sidebar p-5">
            <div className="mb-8 flex items-center justify-between">
              <Brand />
              <button aria-label="Fechar menu" onClick={() => setOpen(false)}>
                <X size={20} />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
            <button className="lg:hidden" aria-label="Abrir menu" onClick={() => setOpen(true)}>
              <Menu size={22} />
            </button>
            <div className="mr-auto">
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
            <PeriodFilter />
            {actions}
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="brand-gradient flex size-10 items-center justify-center rounded-xl text-primary-foreground">
        <Wallet size={20} />
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">Planejamento</span>
        <span className="block text-sm font-semibold text-muted-foreground">Financeiro</span>
      </span>
    </div>
  );
}
