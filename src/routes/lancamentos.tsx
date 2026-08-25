import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/finance/AppShell";
import { usePeriod } from "@/components/finance/period-context";
import { useCategorias } from "@/hooks/useCategorias";
import { useContas } from "@/hooks/useContas";
import {
  useAtualizarLancamento,
  useCriarLancamento,
  useExcluirLancamento,
  useLancamentos,
} from "@/hooks/useLancamentos";
import {
  formatBRL,
  formatDate,
  MONTHS,
  ROTULO_FORMA_PAGAMENTO,
  ROTULO_TIPO_LANCAMENTO,
  type DestinoRendimento,
  type FormaPagamento,
  type Lancamento,
  type TipoLancamento,
} from "@/lib/finance-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/lancamentos")({
  head: () => ({
    meta: [
      { title: "Lançamentos | Planejamento Financeiro" },
      {
        name: "description",
        content: "Planilha interativa de receitas e despesas com busca, filtros e edição.",
      },
      { property: "og:title", content: "Lançamentos | Planejamento Financeiro" },
      {
        property: "og:description",
        content: "Cadastre, filtre e gerencie todos os seus lançamentos financeiros.",
      },
    ],
  }),
  component: LancamentosPage,
});

const selectCls =
  "h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const TIPOS: TipoLancamento[] = [
  "entrada",
  "saida",
  "guardado",
  "retirado",
  "rendimento",
  "perda",
  "transferencia",
];
const FORMAS: FormaPagamento[] = ["debito", "pix", "dinheiro", "credito"];

type FormState = {
  data: string;
  descricao: string;
  valor: string;
  tipo: TipoLancamento;
  contaId: string;
  categoriaId: string;
  formaPagamento: FormaPagamento;
  contaDestinoId: string;
  destino: DestinoRendimento;
};

function emptyForm(contaId: string, categoriaId: string): FormState {
  return {
    data: new Date().toISOString().slice(0, 10),
    descricao: "",
    valor: "",
    tipo: "saida",
    contaId,
    categoriaId,
    formaPagamento: "debito",
    contaDestinoId: "",
    destino: "conta",
  };
}

function LancamentosPage() {
  const { month, year } = usePeriod();

  const { data: accounts = [], isLoading: carregandoContas } = useContas();
  const { data: categorias = [], isLoading: carregandoCategorias } = useCategorias();

  const [query, setQuery] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | TipoLancamento>("todos");

  // Categoria/tipo filtram no servidor (menos dado trafegado); busca por
  // texto livre continua no cliente — a API não tem busca por texto.
  const { data: lancamentos = [], isLoading: carregandoLancamentos } = useLancamentos(year, {
    ...(month !== 0 ? { mes: month } : {}),
    ...(categoriaFiltro !== "todas" ? { categoriaId: categoriaFiltro } : {}),
    ...(tipoFiltro !== "todos" ? { tipo: tipoFiltro } : {}),
  });
  const criar = useCriarLancamento(year);
  const atualizar = useAtualizarLancamento(year);
  const excluirMutacao = useExcluirLancamento(year);

  const categoriaPorId = (id: string | undefined) => categorias.find((c) => c.id === id);
  const contaPorId = (id: string | undefined) => accounts.find((a) => a.id === id);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lancamento | null>(null);
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(accounts[0]?.id ?? "", categorias[0]?.id ?? ""),
  );

  const ehSaida = form.tipo === "saida";
  const ehTransferencia = form.tipo === "transferencia";
  const ehRendimentoOuPerda = form.tipo === "rendimento" || form.tipo === "perda";

  // Cartão só entra quando a saída é no crédito — nas demais combinações a
  // conta tem que ser corrente (mesma regra do domínio real, ver ADR-0002
  // do backend: crédito exige cartão, o resto exige conta corrente).
  const contasValidas = useMemo(
    () =>
      accounts.filter((a) =>
        ehSaida && form.formaPagamento === "credito"
          ? a.tipo === "cartao_credito"
          : a.tipo === "corrente",
      ),
    [accounts, ehSaida, form.formaPagamento],
  );

  // Se trocar tipo/forma de pagamento deixar a conta escolhida inválida
  // (ex.: estava um cartão selecionado e a forma virou "pix"), realinha
  // sozinho para a primeira conta que ainda faz sentido.
  useEffect(() => {
    if (!contasValidas.some((a) => a.id === form.contaId)) {
      setForm((f) => ({ ...f, contaId: contasValidas[0]?.id ?? "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contasValidas]);

  const rows = useMemo(
    () =>
      [...lancamentos]
        .filter((t) =>
          query
            ? `${t.descricao} ${categoriaPorId(t.categoriaId)?.nome ?? ""}`
                .toLowerCase()
                .includes(query.toLowerCase())
            : true,
        )
        .sort((a, b) => b.data.localeCompare(a.data)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lancamentos, query],
  );

  // Simplificação (ver ADR-01/api-client.ts): só entrada/saída entram nesse
  // rótulo de conferência local — guardado, retirado, rendimento, perda e
  // transferência têm efeitos que dependem de conta/destino, e os totais
  // autoritativos (KPIs) já vêm prontos de `useResumo` nas outras telas.
  const total = rows.reduce(
    (a, t) => a + (t.tipo === "entrada" ? t.valor : t.tipo === "saida" ? -t.valor : 0),
    0,
  );

  function openNew() {
    setEditing(null);
    setForm(
      emptyForm(accounts.find((a) => a.tipo === "corrente")?.id ?? "", categorias[0]?.id ?? ""),
    );
    setOpen(true);
  }

  function openEdit(tx: Lancamento) {
    setEditing(tx);
    setForm({
      data: tx.data,
      descricao: tx.descricao,
      valor: String(tx.valor),
      tipo: tx.tipo,
      contaId: tx.contaId,
      categoriaId: tx.categoriaId ?? categorias[0]?.id ?? "",
      formaPagamento: tx.formaPagamento ?? "debito",
      contaDestinoId: tx.contaDestinoId ?? "",
      destino: tx.destino ?? "conta",
    });
    setOpen(true);
  }

  function save() {
    const valor = Number(form.valor.replace(",", "."));
    if (!form.descricao.trim() || !valor || !form.contaId) {
      toast.error("Informe descrição, valor e conta válidos.");
      return;
    }
    if (ehTransferencia && !form.contaDestinoId) {
      toast.error("Escolha a conta de destino da transferência.");
      return;
    }

    const payload: Omit<Lancamento, "id"> = {
      data: form.data,
      descricao: form.descricao.trim(),
      valor,
      tipo: form.tipo,
      contaId: form.contaId,
      ...(ehSaida ? { categoriaId: form.categoriaId, formaPagamento: form.formaPagamento } : {}),
      ...(ehTransferencia ? { contaDestinoId: form.contaDestinoId } : {}),
      ...(ehRendimentoOuPerda ? { destino: form.destino } : {}),
    };

    const mutacao = editing
      ? atualizar.mutateAsync({ id: editing.id, dados: payload })
      : criar.mutateAsync(payload);

    mutacao
      .then(() => {
        toast.success(editing ? "Lançamento atualizado." : "Lançamento criado.");
        setOpen(false);
      })
      // ADR-01: toda resposta de erro tem `detail` pronto para exibir — é
      // exatamente `error.message` aqui, já que `ErroApi` usa isso como
      // mensagem (ver `lib/api-client.ts`).
      .catch((e) => toast.error(e instanceof Error ? e.message : "A operação falhou."));
  }

  function excluir(id: string) {
    excluirMutacao
      .mutateAsync(id)
      .then(() => toast.success("Lançamento excluído."))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível excluir."));
  }

  return (
    <AppShell
      title="Lançamentos"
      subtitle={month === 0 ? `Ano ${year}` : `${MONTHS[month - 1]} de ${year}`}
      actions={
        <Button
          onClick={openNew}
          disabled={carregandoContas || carregandoCategorias}
          className="gap-2"
        >
          <Plus size={16} /> Novo Lançamento
        </Button>
      }
    >
      <div className="panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por descrição ou categoria"
              className="bg-surface-2 pl-9"
            />
          </div>
          <select
            aria-label="Categoria"
            className={selectCls}
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            <option value="todas">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <select
            aria-label="Tipo"
            className={selectCls}
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as "todos" | TipoLancamento)}
          >
            <option value="todos">Todos os tipos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO_LANCAMENTO[t]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="panel mt-4 overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="border-b border-border px-4 py-3 font-medium">Data</th>
              <th className="border-b border-border px-4 py-3 font-medium">Descrição</th>
              <th className="border-b border-border px-4 py-3 font-medium">Categoria</th>
              <th className="border-b border-border px-4 py-3 font-medium">Conta</th>
              <th className="border-b border-border px-4 py-3 text-right font-medium">Valor</th>
              <th className="border-b border-border px-4 py-3 font-medium">Tipo</th>
              <th className="border-b border-border px-4 py-3 font-medium">Pagamento</th>
              <th className="border-b border-border px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="transition-colors hover:bg-accent/40">
                <td className="border-b border-border px-4 py-3 text-muted-foreground">
                  {formatDate(t.data)}
                </td>
                <td className="border-b border-border px-4 py-3">{t.descricao}</td>
                <td className="border-b border-border px-4 py-3 text-muted-foreground">
                  {categoriaPorId(t.categoriaId)?.nome ?? "—"}
                </td>
                <td className="border-b border-border px-4 py-3 text-muted-foreground">
                  {contaPorId(t.contaId)?.nome ?? "—"}
                  {t.tipo === "transferencia" && t.contaDestinoId && (
                    <span className="text-xs"> → {contaPorId(t.contaDestinoId)?.nome}</span>
                  )}
                </td>
                <td
                  className={`border-b border-border px-4 py-3 text-right tabular-nums ${
                    t.tipo === "entrada" || t.tipo === "retirado" || t.tipo === "rendimento"
                      ? "text-income"
                      : t.tipo === "saida" || t.tipo === "perda"
                        ? "text-expense"
                        : ""
                  }`}
                >
                  {formatBRL(t.valor)}
                </td>
                <td className="border-b border-border px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      t.tipo === "entrada"
                        ? "bg-income-soft text-income"
                        : t.tipo === "saida"
                          ? "bg-expense-soft text-expense"
                          : "bg-surface-2 text-muted-foreground"
                    }`}
                  >
                    {ROTULO_TIPO_LANCAMENTO[t.tipo]}
                  </span>
                </td>
                <td className="border-b border-border px-4 py-3 text-muted-foreground">
                  {t.formaPagamento ? ROTULO_FORMA_PAGAMENTO[t.formaPagamento] : "—"}
                </td>
                <td className="border-b border-border px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Editar"
                      onClick={() => openEdit(t)}
                    >
                      <Pencil size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir"
                      onClick={() => excluir(t.id)}
                    >
                      <Trash2 size={16} className="text-expense" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {carregandoLancamentos && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {!carregandoLancamentos && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum lançamento encontrado para os filtros selecionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {rows.length} lançamentos • Saldo filtrado (entradas − saídas):{" "}
        <span className={total >= 0 ? "text-income" : "text-expense"}>{formatBRL(total)}</span>
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={form.data}
                onChange={(e) => setForm({ ...form, data: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="0,00"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex.: Supermercado do mês"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tp">Tipo</Label>
              <select
                id="tp"
                className={selectCls}
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoLancamento })}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {ROTULO_TIPO_LANCAMENTO[t]}
                  </option>
                ))}
              </select>
            </div>

            {ehSaida && (
              <div className="grid gap-2">
                <Label htmlFor="pagamento">Forma de pagamento</Label>
                <select
                  id="pagamento"
                  className={selectCls}
                  value={form.formaPagamento}
                  onChange={(e) =>
                    setForm({ ...form, formaPagamento: e.target.value as FormaPagamento })
                  }
                >
                  {FORMAS.map((f) => (
                    <option key={f} value={f}>
                      {ROTULO_FORMA_PAGAMENTO[f]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="conta">Conta</Label>
              <select
                id="conta"
                className={selectCls}
                value={form.contaId}
                onChange={(e) => setForm({ ...form, contaId: e.target.value })}
              >
                {contasValidas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>

            {ehTransferencia && (
              <div className="grid gap-2">
                <Label htmlFor="conta-destino">Conta de destino</Label>
                <select
                  id="conta-destino"
                  className={selectCls}
                  value={form.contaDestinoId}
                  onChange={(e) => setForm({ ...form, contaDestinoId: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {accounts
                    .filter((a) => a.id !== form.contaId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {ehRendimentoOuPerda && (
              <div className="grid gap-2">
                <Label htmlFor="destino">Destino</Label>
                <select
                  id="destino"
                  className={selectCls}
                  value={form.destino}
                  onChange={(e) =>
                    setForm({ ...form, destino: e.target.value as DestinoRendimento })
                  }
                >
                  <option value="conta">Conta</option>
                  <option value="guardado">Guardado</option>
                </select>
              </div>
            )}

            {ehSaida && (
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="cat">Categoria</Label>
                <select
                  id="cat"
                  className={selectCls}
                  value={form.categoriaId}
                  onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={criar.isPending || atualizar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
