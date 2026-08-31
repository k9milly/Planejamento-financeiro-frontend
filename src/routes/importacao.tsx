import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, Upload } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/finance/AppShell";
import { usePeriod } from "@/components/finance/period-context";
import { useCategorias } from "@/hooks/useCategorias";
import { useContas } from "@/hooks/useContas";
import { useConfirmarImportacao, usePreviaImportacao } from "@/hooks/useImportacao";
import type { FormatoImportacao, TransacaoPrevia } from "@/lib/api-client";
import { formatBRL, formatDate } from "@/lib/finance-data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/importacao")({
  head: () => ({
    meta: [
      { title: "Importar Extrato | Planejamento Financeiro" },
      {
        name: "description",
        content:
          "Importe um extrato bancário em CSV, XLSX ou OFX, com conferência antes de gravar.",
      },
      { property: "og:title", content: "Importar Extrato | Planejamento Financeiro" },
      {
        property: "og:description",
        content: "Prévia com deduplicação e sugestão de categoria antes de confirmar.",
      },
    ],
  }),
  component: ImportacaoPage,
});

const selectCls =
  "h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const FORMATOS: { valor: FormatoImportacao; rotulo: string }[] = [
  { valor: "csv", rotulo: "CSV" },
  { valor: "xlsx", rotulo: "XLSX" },
  { valor: "ofx", rotulo: "OFX" },
];

/** Estado de uma linha da prévia dentro da tela de conferência — os campos
 * que a pessoa pode ajustar antes de confirmar, por cima do que a API já
 * sugeriu (ADR-08, seção 13 da especificação técnica). */
type LinhaConferencia = TransacaoPrevia & {
  marcada: boolean;
  categoriaId: string;
  lembrarCategoria: boolean;
};

function paraLinha(t: TransacaoPrevia): LinhaConferencia {
  return {
    ...t,
    // "possível repetido" é opt-in pra não duplicar por engano; o resto do
    // lote vem marcado, já que importar o extrato inteiro é o caso comum.
    // "fora do ano" nunca pode ir — uma linha assim derruba a confirmação
    // inteira (ver `especificacao-tecnica-funcional.md`, seção 13).
    marcada: !t.possivelRepetido && !t.foraDoAno,
    categoriaId: t.categoriaSugeridaId ?? "",
    lembrarCategoria: false,
  };
}

function ImportacaoPage() {
  const { year } = usePeriod();
  const { data: contas = [] } = useContas();
  const { data: categorias = [] } = useCategorias();

  const previa = usePreviaImportacao();
  const confirmar = useConfirmarImportacao(year);

  const [formato, setFormato] = useState<FormatoImportacao>("csv");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [contaId, setContaId] = useState("");
  const [mostrarDuplicadas, setMostrarDuplicadas] = useState(false);
  const [linhas, setLinhas] = useState<LinhaConferencia[] | null>(null);

  function enviar() {
    if (!arquivo) {
      toast.error("Escolha um arquivo de extrato.");
      return;
    }
    if (!contaId) {
      toast.error("Escolha a conta de destino.");
      return;
    }
    previa
      .mutateAsync({ ano: year, arquivo, formato })
      .then((resultado) => setLinhas(resultado.transacoes.map(paraLinha)))
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Não foi possível ler o arquivo."),
      );
  }

  function novaImportacao() {
    setLinhas(null);
    setArquivo(null);
    previa.reset();
    confirmar.reset();
  }

  function alterarLinha(fitid: string, mudanca: Partial<LinhaConferencia>) {
    setLinhas((atual) => atual?.map((l) => (l.fitid === fitid ? { ...l, ...mudanca } : l)) ?? null);
  }

  const visiveis = useMemo(
    () => (linhas ?? []).filter((l) => mostrarDuplicadas || !l.duplicado),
    [linhas, mostrarDuplicadas],
  );
  const quantidadeDuplicadas = (linhas ?? []).filter((l) => l.duplicado).length;
  // Só conta o que realmente vai na confirmação — duplicada nunca vai,
  // mesmo que `marcada` tenha ficado `true` por padrão (ela só fica oculta
  // por padrão, o campo em si não muda).
  const quantidadeMarcadas = (linhas ?? []).filter(
    (l) => l.marcada && !l.duplicado && !l.foraDoAno,
  ).length;

  function confirmarImportacao() {
    const paraEnviar = (linhas ?? []).filter((l) => l.marcada && !l.duplicado && !l.foraDoAno);
    if (paraEnviar.length === 0) {
      toast.error("Nenhuma transação marcada para importar.");
      return;
    }
    confirmar
      .mutateAsync(
        paraEnviar.map((l) => ({
          fitid: l.fitid,
          data: l.data,
          valor: l.valor,
          tipo: l.tipoSugerido,
          contaId,
          ...(l.tipoSugerido === "saida" && l.categoriaId ? { categoriaId: l.categoriaId } : {}),
          ...(l.lembrarCategoria && l.categoriaId ? { aprenderPadrao: l.descricao } : {}),
          descricao: l.descricao,
        })),
      )
      .then((resultado) => {
        toast.success(
          `${resultado.importadas} lançamento(s) importado(s)` +
            (resultado.ignoradasDuplicadas > 0
              ? ` • ${resultado.ignoradasDuplicadas} já existiam`
              : "") +
            (resultado.regrasCriadas > 0 ? ` • ${resultado.regrasCriadas} regra(s) nova(s)` : ""),
        );
        novaImportacao();
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível confirmar."));
  }

  return (
    <AppShell title="Importar Extrato" subtitle="CSV, XLSX ou OFX, com conferência antes de gravar">
      {!linhas && (
        <div className="panel max-w-xl p-5">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="formato">Formato</Label>
              <select
                id="formato"
                className={selectCls}
                value={formato}
                onChange={(e) => setFormato(e.target.value as FormatoImportacao)}
              >
                {FORMATOS.map((f) => (
                  <option key={f.valor} value={f.valor}>
                    {f.rotulo}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                O formato não é adivinhado pela extensão do arquivo — escolha o que corresponde ao
                que você vai enviar.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="arquivo">Arquivo</Label>
              <Input
                id="arquivo"
                type="file"
                accept=".csv,.xlsx,.ofx,.ofc"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="conta-importacao">Conta de destino</Label>
              <select
                id="conta-importacao"
                className={selectCls}
                value={contaId}
                onChange={(e) => setContaId(e.target.value)}
              >
                <option value="">Selecione</option>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Aplicada a todas as transações marcadas nesta importação.
              </p>
            </div>
            <Button onClick={enviar} disabled={previa.isPending} className="w-fit gap-2">
              <Upload size={16} /> {previa.isPending ? "Lendo…" : "Ler extrato"}
            </Button>
          </div>
        </div>
      )}

      {linhas && (
        <>
          <div className="panel mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-muted-foreground">
              {visiveis.length} transaç{visiveis.length === 1 ? "ão" : "ões"} na lista •{" "}
              {quantidadeMarcadas} marcada{quantidadeMarcadas === 1 ? "" : "s"} para importar
              {quantidadeDuplicadas > 0 && ` • ${quantidadeDuplicadas} já importada(s)`}
            </p>
            <div className="flex items-center gap-3">
              {quantidadeDuplicadas > 0 && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox
                    checked={mostrarDuplicadas}
                    onCheckedChange={(v) => setMostrarDuplicadas(v === true)}
                  />
                  Mostrar já importadas
                </label>
              )}
              <Button variant="ghost" onClick={novaImportacao}>
                Cancelar
              </Button>
              <Button onClick={confirmarImportacao} disabled={confirmar.isPending}>
                {confirmar.isPending ? "Confirmando…" : "Confirmar importação"}
              </Button>
            </div>
          </div>

          <div className="panel overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="border-b border-border px-3 py-3 font-medium"></th>
                  <th className="border-b border-border px-3 py-3 font-medium">Data</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Descrição</th>
                  <th className="border-b border-border px-3 py-3 text-right font-medium">Valor</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Tipo</th>
                  <th className="border-b border-border px-3 py-3 font-medium">Categoria</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((l) => (
                  <tr
                    key={l.fitid}
                    className={
                      l.foraDoAno
                        ? "bg-expense-soft/40"
                        : l.possivelRepetido
                          ? "bg-accent/40"
                          : l.duplicado
                            ? "opacity-50"
                            : ""
                    }
                  >
                    <td className="border-b border-border px-3 py-2.5">
                      <Checkbox
                        checked={l.marcada}
                        disabled={l.duplicado || l.foraDoAno}
                        onCheckedChange={(v) => alterarLinha(l.fitid, { marcada: v === true })}
                      />
                    </td>
                    <td className="border-b border-border px-3 py-2.5 text-muted-foreground">
                      {formatDate(l.data)}
                    </td>
                    <td className="border-b border-border px-3 py-2.5">
                      {l.descricao}
                      {l.duplicado && (
                        <span className="ml-2 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground">
                          já importada
                        </span>
                      )}
                      {l.possivelRepetido && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
                          <AlertTriangle size={11} /> pode ser repetida
                        </span>
                      )}
                      {l.foraDoAno && (
                        <span className="ml-2 rounded-full bg-expense-soft px-2 py-0.5 text-xs text-expense">
                          fora de {year}
                        </span>
                      )}
                    </td>
                    <td
                      className={`border-b border-border px-3 py-2.5 text-right tabular-nums ${
                        l.tipoSugerido === "entrada" ? "text-income" : "text-expense"
                      }`}
                    >
                      {formatBRL(l.valor)}
                    </td>
                    <td className="border-b border-border px-3 py-2.5 text-muted-foreground">
                      {l.tipoSugerido === "entrada" ? "Entrada" : "Saída"}
                    </td>
                    <td className="border-b border-border px-3 py-2.5">
                      {l.tipoSugerido === "saida" ? (
                        <div className="flex items-center gap-2">
                          <select
                            className={selectCls}
                            value={l.categoriaId}
                            onChange={(e) => alterarLinha(l.fitid, { categoriaId: e.target.value })}
                          >
                            <option value="">Sem categoria</option>
                            {categorias.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.nome}
                              </option>
                            ))}
                          </select>
                          {l.categoriaId && (
                            <label
                              className="flex items-center gap-1 text-xs text-muted-foreground"
                              title="Grava uma regra: da próxima vez, uma descrição parecida já sugere esta categoria."
                            >
                              <Checkbox
                                checked={l.lembrarCategoria}
                                onCheckedChange={(v) =>
                                  alterarLinha(l.fitid, { lembrarCategoria: v === true })
                                }
                              />
                              lembrar
                            </label>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {visiveis.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhuma transação para mostrar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AppShell>
  );
}
