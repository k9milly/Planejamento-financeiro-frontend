import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/finance/AppShell";
import { usePeriod } from "@/components/finance/period-context";
import { useResumo } from "@/hooks/useResumo";
import { MONTHS, formatBRL } from "@/lib/finance-data";

export const Route = createFileRoute("/tabela-dinamica")({
  head: () => ({
    meta: [
      { title: "Tabela Dinâmica | Planejamento Financeiro" },
      {
        name: "description",
        content: "Cruze categorias e meses para analisar gastos acumulados do ano.",
      },
      { property: "og:title", content: "Tabela Dinâmica | Planejamento Financeiro" },
      {
        property: "og:description",
        content: "Análise pivot de categorias por mês com totais e médias.",
      },
    ],
  }),
  component: PivotPage,
});

function PivotPage() {
  const { year } = usePeriod();
  const { data: resumo, isLoading } = useResumo(year);
  const meses = resumo?.meses ?? [];

  // Só saída tem categoria neste domínio (guardado, retirado, rendimento,
  // perda e transferência não têm — ver Lançamentos), então a tabela
  // dinâmica é sempre sobre saídas — o backend só devolve `gastos_por_categoria`
  // de saídas mesmo, então não há filtro a fazer aqui: é transposição direta.
  const categoriasComGasto = [
    ...new Set(meses.flatMap((m) => m.gastosPorCategoria.map((g) => g.categoria))),
  ].sort();

  const rows = categoriasComGasto
    .map((categoria) => {
      const values = meses.map(
        (m) => m.gastosPorCategoria.find((g) => g.categoria === categoria)?.total ?? 0,
      );
      const total = values.reduce((a, b) => a + b, 0);
      const active = values.filter((v) => v > 0).length;
      return { category: categoria, values, total, average: active ? total / active : 0 };
    })
    .filter((r) => r.total > 0);

  const columnTotals = MONTHS.map((_, i) => rows.reduce((a, r) => a + (r.values[i] ?? 0), 0));
  const grandTotal = rows.reduce((a, r) => a + r.total, 0);
  const max = Math.max(...rows.flatMap((r) => r.values), 1);

  return (
    <AppShell title="Tabela Dinâmica" subtitle={`Saídas por categoria x mês • ${year}`}>
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[1000px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface-2 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="sticky left-0 z-10 border-b border-r border-border bg-surface-2 px-4 py-3 text-left font-medium">
                Categoria
              </th>
              {MONTHS.map((m, i) => (
                <th key={m} className="border-b border-border px-3 py-3 text-right font-medium">
                  <Link
                    to="/mes/$ano/$mes"
                    params={{ ano: String(year), mes: String(i + 1) }}
                    className="transition-colors hover:text-primary"
                  >
                    {m}
                  </Link>
                </th>
              ))}
              <th className="border-b border-l border-border px-4 py-3 text-right font-medium">
                Total
              </th>
              <th className="border-b border-border px-4 py-3 text-right font-medium">Média</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.category} className="hover:bg-accent/30">
                <td className="sticky left-0 z-10 border-b border-r border-border bg-card px-4 py-3 font-medium">
                  {r.category}
                </td>
                {r.values.map((v, i) => (
                  <td
                    key={i}
                    className="border-b border-border px-3 py-3 text-right tabular-nums"
                    style={
                      v > 0
                        ? {
                            background: `color-mix(in oklab, var(--expense) ${Math.round((v / max) * 22)}%, transparent)`,
                          }
                        : undefined
                    }
                  >
                    {v > 0 ? formatBRL(v) : "—"}
                  </td>
                ))}
                <td className="border-b border-l border-border px-4 py-3 text-right font-semibold tabular-nums">
                  {formatBRL(r.total)}
                </td>
                <td className="border-b border-border px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {formatBRL(r.average)}
                </td>
              </tr>
            ))}
            {isLoading && (
              <tr>
                <td colSpan={15} className="px-4 py-10 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            <tr className="bg-surface-2 font-semibold">
              <td className="sticky left-0 z-10 border-r border-border bg-surface-2 px-4 py-3">
                Total
              </td>
              {columnTotals.map((v, i) => (
                <td key={i} className="px-3 py-3 text-right tabular-nums">
                  {v > 0 ? formatBRL(v) : "—"}
                </td>
              ))}
              <td className="border-l border-border px-4 py-3 text-right tabular-nums">
                {formatBRL(grandTotal)}
              </td>
              <td className="px-4 py-3" />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        A intensidade do fundo indica o peso do gasto em relação ao maior valor da tabela.
      </p>
    </AppShell>
  );
}
