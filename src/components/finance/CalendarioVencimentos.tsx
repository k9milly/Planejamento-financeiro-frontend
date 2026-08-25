import { useContas } from "@/hooks/useContas";
import { useGastosFixos } from "@/hooks/useGastosFixos";

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Mini calendário do mês selecionado, marcando os dias em que algum gasto
 * fixo ou fatura de cartão vence. Mesma ideia do calendário do modo painel
 * do backend.
 */
export function CalendarioVencimentos({ year, month }: { year: number; month: number }) {
  const { data: gastosFixos = [] } = useGastosFixos(year);
  const { data: accounts = [] } = useContas();

  const ultimoDia = new Date(year, month, 0).getDate();
  const deslocamento = new Date(year, month - 1, 1).getDay();

  const gastosAtivos = gastosFixos.filter((g) => g.ativo);
  const cartoes = accounts.filter((a) => a.tipo === "cartao_credito" && a.diaVencimentoFatura);

  const porDia = new Map<number, { gastos: typeof gastosAtivos; cartoes: typeof cartoes }>();
  for (const g of gastosAtivos) {
    const dia = Math.min(g.diaVencimento, ultimoDia);
    const atual = porDia.get(dia) ?? { gastos: [], cartoes: [] };
    atual.gastos.push(g);
    porDia.set(dia, atual);
  }
  for (const c of cartoes) {
    const dia = Math.min(c.diaVencimentoFatura!, ultimoDia);
    const atual = porDia.get(dia) ?? { gastos: [], cartoes: [] };
    atual.cartoes.push(c);
    porDia.set(dia, atual);
  }

  const celulas: (number | null)[] = [
    ...Array.from({ length: deslocamento }, () => null),
    ...Array.from({ length: ultimoDia }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={`vazio-${i}`} />;
          const marcadores = porDia.get(dia);
          return (
            <div
              key={dia}
              className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg bg-surface-2 text-xs"
              title={
                marcadores
                  ? [
                      ...marcadores.gastos.map((g) => g.descricao),
                      ...marcadores.cartoes.map((c) => `Fatura ${c.nome}`),
                    ].join(", ")
                  : undefined
              }
            >
              <span>{dia}</span>
              {marcadores && (
                <span className="flex gap-0.5">
                  {marcadores.gastos.length > 0 && (
                    <span className="size-1.5 rounded-full bg-primary" />
                  )}
                  {marcadores.cartoes.length > 0 && (
                    <span className="size-1.5 rounded-full bg-expense" />
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary" /> Gasto fixo
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-expense" /> Fatura de cartão
        </span>
      </div>
    </div>
  );
}
