import { createFileRoute, Link } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { AppShell } from "@/components/finance/AppShell";
import { MetaPoupancaSection } from "@/components/finance/MetaPoupancaSection";
import { usePeriod } from "@/components/finance/period-context";
import { useCategorias } from "@/hooks/useCategorias";
import { useResumo } from "@/hooks/useResumo";
import { useAtualizarUsuario, useUsuario } from "@/hooks/useUsuario";
import { formatBRL, MONTHS } from "@/lib/finance-data";
import { Switch } from "@/components/ui/switch";

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

function Bar({ percent, tone }: { percent: number; tone: "income" | "expense" }) {
  const bg = tone === "income" ? "bg-income" : "bg-expense";
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
  const { data: categorias = [] } = useCategorias();
  const { data: usuario } = useUsuario();
  const atualizarUsuario = useAtualizarUsuario();
  const meses = resumo?.meses ?? [];

  // Gasto real por categoria — a mesma agregação que a Tabela Dinâmica e o
  // Dashboard já usam (ADR-11). O limite em si já é real também (campo
  // `limiteMensal` da própria Categoria, ver Configurações → Categorias) —
  // isto substitui o array mockado `budgets` que existia antes do ADR-11.
  const spent = (categoriaNome: string) => {
    if (month === 0) {
      return meses.reduce(
        (a, m) => a + (m.gastosPorCategoria.find((g) => g.categoria === categoriaNome)?.total ?? 0),
        0,
      );
    }
    return (
      meses[month - 1]?.gastosPorCategoria.find((g) => g.categoria === categoriaNome)?.total ?? 0
    );
  };

  const categoriasComOrcamento = categorias.filter((c) => c.ativa && c.limiteMensal);
  // `limite_mensal` é sempre mensal (ADR-11) — "Ano inteiro" multiplica por
  // 12 pra dar um teto comparável, já que não existe limite anual próprio.
  const fatorMeses = month === 0 ? 12 : 1;

  // Preferência da conta, não da categoria — desligar não apaga nenhum
  // limite, só esconde a seção (ADR-11).
  const mostrarOrcamento = usuario?.mostrarOrcamentoCategoria ?? true;

  function alternarMostrarOrcamento(v: boolean) {
    atualizarUsuario.mutateAsync({ mostrarOrcamentoCategoria: v }).catch(() => {
      // Falha aqui é rara (mesmo endpoint do nome/e-mail de alerta) e não
      // impede o resto da tela de funcionar — sem toast de propósito, pra
      // não interromper por causa de uma preferência de exibição.
    });
  }

  return (
    <AppShell
      title="Metas & Orçamentos"
      subtitle={month === 0 ? `Ano ${year}` : `${MONTHS[month - 1]} de ${year}`}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-5">
          <header className="mb-5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wallet size={18} className="text-primary" />
              <h2 className="text-base font-semibold">Orçamentos por categoria</h2>
            </div>
            <Switch
              checked={mostrarOrcamento}
              onCheckedChange={alternarMostrarOrcamento}
              aria-label={mostrarOrcamento ? "Esconder orçamentos" : "Mostrar orçamentos"}
            />
          </header>

          {!mostrarOrcamento && (
            <p className="text-sm text-muted-foreground">
              Escondido — ligue o interruptor acima pra ver de novo. Nenhum limite foi apagado.
            </p>
          )}

          {mostrarOrcamento && categoriasComOrcamento.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhuma categoria com limite definido ainda.{" "}
              <Link to="/configuracoes" className="text-primary hover:underline">
                Defina um em Configurações → Categorias
              </Link>
              .
            </p>
          )}

          {mostrarOrcamento && categoriasComOrcamento.length > 0 && (
            <ul className="space-y-5">
              {categoriasComOrcamento.map((c) => {
                const used = spent(c.nome);
                const limit = c.limiteMensal! * fatorMeses;
                const pct = (used / limit) * 100;
                return (
                  <li key={c.id}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full" style={{ background: c.cor }} />
                        {c.nome}
                      </span>
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
          )}
        </section>

        <MetaPoupancaSection />
      </div>
    </AppShell>
  );
}
