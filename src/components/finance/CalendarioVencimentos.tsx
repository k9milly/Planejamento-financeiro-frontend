import { useEffect, useRef, useState } from "react";
import { useContas } from "@/hooks/useContas";
import { useGastosFixos } from "@/hooks/useGastosFixos";

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Mini calendário do mês selecionado, marcando os dias em que algum gasto
 * fixo ou fatura de cartão vence. Mesma ideia do calendário do modo painel
 * do backend.
 *
 * Tooltip flutuante (ADR-07) em vez do quadrado do dia crescer — crescer
 * empurraria os vizinhos e desalinharia a grade quando há vários dias
 * marcados próximos. No desktop, hover mostra; no toque (sem hover), tap no
 * dia fixa o tooltip aberto até tocar em outro lugar ou no mesmo dia de
 * novo — é o padrão que substitui o hover que não existe em tela de toque.
 */
export function CalendarioVencimentos({ year, month }: { year: number; month: number }) {
  const { data: gastosFixos = [] } = useGastosFixos(year);
  const { data: accounts = [] } = useContas();

  const [hoverDia, setHoverDia] = useState<number | null>(null);
  const [fixadoDia, setFixadoDia] = useState<number | null>(null);
  const raizRef = useRef<HTMLDivElement>(null);

  // Tocar fora do calendário (ou noutro dia) fecha o tooltip fixado — só
  // precisa existir enquanto algo está fixado.
  useEffect(() => {
    if (fixadoDia === null) return;
    function aoTocarFora(e: PointerEvent) {
      if (!raizRef.current?.contains(e.target as Node)) setFixadoDia(null);
    }
    document.addEventListener("pointerdown", aoTocarFora);
    return () => document.removeEventListener("pointerdown", aoTocarFora);
  }, [fixadoDia]);

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

  const diaAberto = fixadoDia ?? hoverDia;

  return (
    <div ref={raizRef}>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
        {DIAS_SEMANA.map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {celulas.map((dia, i) => {
          if (dia === null) return <div key={`vazio-${i}`} />;
          const marcadores = porDia.get(dia);
          const itens = marcadores
            ? [
                ...marcadores.gastos.map((g) => ({ chave: `gf-${g.id}`, texto: g.descricao })),
                ...marcadores.cartoes.map((c) => ({
                  chave: `ca-${c.id}`,
                  texto: `Fatura ${c.nome}`,
                })),
              ]
            : [];

          return (
            <div key={dia} className="relative">
              <button
                type="button"
                disabled={itens.length === 0}
                className="flex aspect-square w-full flex-col items-center justify-center gap-0.5 rounded-lg bg-surface-2 text-xs enabled:cursor-pointer disabled:cursor-default"
                onMouseEnter={() => itens.length > 0 && setHoverDia(dia)}
                onMouseLeave={() => setHoverDia(null)}
                onClick={() => itens.length > 0 && setFixadoDia((d) => (d === dia ? null : dia))}
                aria-label={
                  itens.length > 0
                    ? `Dia ${dia}: ${itens.map((it) => it.texto).join(", ")}`
                    : `Dia ${dia}`
                }
              >
                <span>{dia}</span>
                {itens.length > 0 && (
                  <span className="flex gap-0.5">
                    {marcadores!.gastos.length > 0 && (
                      <span className="size-1.5 rounded-full bg-primary" />
                    )}
                    {marcadores!.cartoes.length > 0 && (
                      <span className="size-1.5 rounded-full bg-expense" />
                    )}
                  </span>
                )}
              </button>

              {diaAberto === dia && itens.length > 0 && (
                <div className="absolute bottom-full left-1/2 z-20 mb-1.5 w-max max-w-[180px] -translate-x-1/2 rounded-lg border border-border bg-popover p-2 text-xs text-popover-foreground shadow-lg">
                  <ul className="space-y-1">
                    {itens.map((it) => (
                      <li key={it.chave} className="truncate">
                        {it.texto}
                      </li>
                    ))}
                  </ul>
                  <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-popover" />
                </div>
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
