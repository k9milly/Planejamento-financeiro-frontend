import { Link } from "@tanstack/react-router";
import { AlertTriangle, CreditCard, Receipt } from "lucide-react";
import { useAlertas } from "@/hooks/useAlertas";
import { formatBRL } from "@/lib/finance-data";

function rotuloDias(dias: number) {
  if (dias === 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  return `vence em ${dias} dias`;
}

/**
 * Painel de vencimentos próximos (ADR-06) — só gasto fixo/fatura não pagos
 * dentro de 3 dias, calculado pelo backend a cada busca (`GET /alertas`,
 * sem tabela própria). Ação de pagar mora nas telas de origem (Gastos
 * Fixos / Configurações → Contas); este painel só avisa e leva pra lá.
 */
export function AlertasVencimento() {
  const { data: alertas = [], isLoading } = useAlertas();

  return (
    <section className="panel p-5">
      <header className="mb-4 flex items-center gap-2">
        <AlertTriangle size={18} className="text-primary" />
        <h2 className="text-base font-semibold">Vencendo em breve</h2>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!isLoading && alertas.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nada vencendo nos próximos 3 dias — sem gasto fixo ou fatura pendente.
        </p>
      )}

      <ul className="divide-y divide-border">
        {alertas.map((a) => (
          <li key={`${a.tipo}-${a.tipo === "fatura" ? a.cartaoId : a.gastoFixoId}`}>
            <Link
              to={a.tipo === "fatura" ? "/configuracoes" : "/gastos-fixos"}
              className="flex items-center gap-3 py-3 text-sm transition-colors hover:text-primary"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-expense-soft text-expense">
                {a.tipo === "fatura" ? <CreditCard size={15} /> : <Receipt size={15} />}
              </span>
              <span className="min-w-0 flex-1 truncate">
                {a.tipo === "fatura" ? a.nomeCartao : a.nome}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {rotuloDias(a.diasRestantes)}
              </span>
              <span className="w-24 shrink-0 text-right tabular-nums text-expense">
                {formatBRL(a.valor)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
