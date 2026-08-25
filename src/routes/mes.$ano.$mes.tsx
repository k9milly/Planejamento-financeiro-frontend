import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDownRight, ArrowLeft, ArrowUpRight, PiggyBank, Wallet } from "lucide-react";
import { AppShell } from "@/components/finance/AppShell";
import { KpiCard } from "@/components/finance/KpiCard";
import { useCategorias } from "@/hooks/useCategorias";
import { useLancamentos } from "@/hooks/useLancamentos";
import { useResumo } from "@/hooks/useResumo";
import { MONTHS, formatBRL, formatDate } from "@/lib/finance-data";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/mes/$ano/$mes")({
  head: () => ({
    meta: [
      { title: "Detalhes do Mês | Planejamento Financeiro" },
      {
        name: "description",
        content: "Resumo do mês com entradas, saídas, categorias e lista completa de lançamentos.",
      },
      { property: "og:title", content: "Detalhes do Mês | Planejamento Financeiro" },
      {
        property: "og:description",
        content: "Veja o desempenho financeiro de um mês específico em detalhes.",
      },
    ],
  }),
  component: MonthDetail,
});

function MonthDetail() {
  const { ano, mes } = Route.useParams();

  const year = Number(ano);
  const month = Math.min(12, Math.max(1, Number(mes) || 1));
  const label = `${MONTHS[month - 1]} de ${year}`;

  const { data: resumo } = useResumo(year);
  const { data: rows = [], isLoading } = useLancamentos(year, { mes: month });
  const { data: categorias = [] } = useCategorias();

  const mesResumo = resumo?.meses[month - 1];
  const income = mesResumo?.entradas ?? 0;
  const expense = mesResumo?.saidas ?? 0;
  const balance = mesResumo?.saldo ?? 0;
  const savingRate = income > 0 ? ((income - expense) / income) * 100 : 0;

  const byCategory = [...(mesResumo?.gastosPorCategoria ?? [])]
    .map((g) => ({ name: g.categoria, value: g.total }))
    .sort((a, b) => b.value - a.value);

  const linhas = [...rows].sort((a, b) => b.data.localeCompare(a.data));

  const maxCat = byCategory[0]?.value ?? 1;
  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <AppShell
      title={`Detalhes de ${MONTHS[month - 1]}`}
      subtitle={label}
      actions={
        <div className="flex gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/mes/$ano/$mes" params={{ ano: String(prev.y), mes: String(prev.m) }}>
              ← {MONTHS[prev.m - 1]}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/mes/$ano/$mes" params={{ ano: String(next.y), mes: String(next.m) }}>
              {MONTHS[next.m - 1]} →
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link to="/">
              <ArrowLeft size={14} /> Dashboard
            </Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Saldo do Mês" value={formatBRL(balance)} hint={label} icon={Wallet} />
        <KpiCard
          label="Entradas"
          value={formatBRL(income)}
          hint={`${linhas.filter((t) => t.tipo === "entrada").length} lançamentos`}
          icon={ArrowUpRight}
          tone="income"
        />
        <KpiCard
          label="Saídas"
          value={formatBRL(expense)}
          hint={`${linhas.filter((t) => t.tipo === "saida").length} lançamentos`}
          icon={ArrowDownRight}
          tone="expense"
        />
        <KpiCard
          label="Taxa de Poupança"
          value={`${savingRate.toFixed(1)}%`}
          hint={savingRate >= 20 ? "Acima da meta de 20%" : "Abaixo da meta de 20%"}
          icon={PiggyBank}
          tone={savingRate >= 20 ? "income" : "expense"}
        />
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <section className="panel p-5">
          <h2 className="mb-4 text-base font-semibold">Saídas por categoria</h2>
          {byCategory.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma saída neste mês.</p>
          )}
          <ul className="space-y-3">
            {byCategory.map((c) => (
              <li key={c.name}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="tabular-nums">{formatBRL(c.value)}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-surface-2">
                  <div
                    className="h-2 rounded-full bg-expense"
                    style={{ width: `${(c.value / maxCat) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel overflow-x-auto xl:col-span-2">
          <table className="w-full min-w-[620px] border-collapse text-sm">
            <thead>
              <tr className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="border-b border-border px-4 py-3 font-medium">Data</th>
                <th className="border-b border-border px-4 py-3 font-medium">Descrição</th>
                <th className="border-b border-border px-4 py-3 font-medium">Categoria</th>
                <th className="border-b border-border px-4 py-3 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-accent/40">
                  <td className="border-b border-border px-4 py-3 text-muted-foreground">
                    {formatDate(t.data)}
                  </td>
                  <td className="border-b border-border px-4 py-3">{t.descricao}</td>
                  <td className="border-b border-border px-4 py-3 text-muted-foreground">
                    {categorias.find((c) => c.id === t.categoriaId)?.nome ?? "—"}
                  </td>
                  <td
                    className={`border-b border-border px-4 py-3 text-right tabular-nums ${t.tipo === "entrada" ? "text-income" : t.tipo === "saida" ? "text-expense" : ""}`}
                  >
                    {t.tipo === "entrada" ? "+" : t.tipo === "saida" ? "−" : ""}{" "}
                    {formatBRL(t.valor)}
                  </td>
                </tr>
              ))}
              {isLoading && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    Carregando…
                  </td>
                </tr>
              )}
              {!isLoading && linhas.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhum lançamento em {label}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
