import { createFileRoute } from "@tanstack/react-router";
import { Info, Target, Wallet } from "lucide-react";
import { AppShell } from "@/components/finance/AppShell";
import { usePeriod } from "@/components/finance/period-context";
import { useResumo } from "@/hooks/useResumo";
import { MONTHS, budgets, formatBRL, goals } from "@/lib/finance-data";

export const Route = createFileRoute("/metas")({
  head: () => ({
    meta: [
      { title: "Metas & Orçamentos | Planejamento Financeiro" },
      {
        name: "description",
        content: "Acompanhe orçamentos por categoria e o progresso das suas metas financeiras.",
      },
      { property: "og:title", content: "Metas & Orçamentos | Planejamento Financeiro" },
      {
        property: "og:description",
        content: "Limites mensais por categoria e evolução das metas de poupança.",
      },
    ],
  }),
  component: MetasPage,
});

function Bar({ percent, tone }: { percent: number; tone: "income" | "expense" | "primary" }) {
  const bg = tone === "income" ? "bg-income" : tone === "expense" ? "bg-expense" : "bg-primary";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className={`h-full rounded-full ${bg}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

function MetasPage() {
  const { month, year } = usePeriod();
  const { data: resumo } = useResumo(year);
  const meses = resumo?.meses ?? [];

  // Gasto real por categoria — o backend já traz isso pronto no resumo
  // (mesma fonte usada no Dashboard e na Tabela Dinâmica). Os orçamentos
  // (limites) e as metas de poupança, porém, não têm endpoint no backend
  // (ver ADR 0007 do backend), então continuam como dados de exemplo.
  const spent = (category: string) => {
    if (month === 0) {
      return meses.reduce(
        (a, m) => a + (m.gastosPorCategoria.find((g) => g.categoria === category)?.total ?? 0),
        0,
      );
    }
    return meses[month - 1]?.gastosPorCategoria.find((g) => g.categoria === category)?.total ?? 0;
  };

  return (
    <AppShell
      title="Metas & Orçamentos"
      subtitle={month === 0 ? `Ano ${year}` : `${MONTHS[month - 1]} de ${year}`}
    >
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-border bg-surface-2 px-4 py-3 text-xs text-muted-foreground">
        <Info size={14} className="mt-0.5 shrink-0" />
        <p>
          Os limites de orçamento e as metas de poupança abaixo são dados de exemplo — o
          acompanhamento de gasto por categoria já usa os lançamentos reais.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <header className="mb-5 flex items-center gap-2">
            <Wallet size={18} className="text-primary" />
            <h2 className="text-base font-semibold">Orçamentos por categoria</h2>
          </header>
          <ul className="space-y-5">
            {budgets.map((b) => {
              const used = spent(b.category);
              const limit = month === 0 ? b.limit * 8 : b.limit;
              const pct = (used / limit) * 100;
              return (
                <li key={b.category}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>{b.category}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatBRL(used)} / {formatBRL(limit)}
                    </span>
                  </div>
                  <Bar percent={pct} tone={pct > 100 ? "expense" : "income"} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pct > 100
                      ? `Estourou ${formatBRL(used - limit)} do orçamento`
                      : `${(100 - pct).toFixed(0)}% disponível`}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel p-5">
          <header className="mb-5 flex items-center gap-2">
            <Target size={18} className="text-primary" />
            <h2 className="text-base font-semibold">Metas de poupança</h2>
          </header>
          <ul className="space-y-5">
            {goals.map((g) => {
              const pct = (g.saved / g.target) * 100;
              return (
                <li key={g.name}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span>{g.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {formatBRL(g.saved)} / {formatBRL(g.target)}
                    </span>
                  </div>
                  <Bar percent={pct} tone="primary" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {pct.toFixed(0)}% concluído • faltam {formatBRL(g.target - g.saved)}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
