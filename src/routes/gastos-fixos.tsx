import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/finance/AppShell";
import { usePeriod } from "@/components/finance/period-context";
import { useCategorias } from "@/hooks/useCategorias";
import { useContas } from "@/hooks/useContas";
import {
  useAtualizarGastoFixo,
  useCriarGastoFixo,
  useDesfazerGastoFixo,
  useExcluirGastoFixo,
  useGastosFixos,
  usePagarGastoFixo,
} from "@/hooks/useGastosFixos";
import {
  formatBRL,
  MONTHS,
  ROTULO_FORMA_PAGAMENTO,
  type FormaPagamento,
  type GastoFixo,
} from "@/lib/finance-data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/gastos-fixos")({
  head: () => ({
    meta: [
      { title: "Gastos Fixos | Planejamento Financeiro" },
      {
        name: "description",
        content: "Contas recorrentes do mês, com situação de pagamento por mês.",
      },
      { property: "og:title", content: "Gastos Fixos | Planejamento Financeiro" },
      {
        property: "og:description",
        content: "Cadastre gastos fixos e marque o que já foi pago no mês.",
      },
    ],
  }),
  component: GastosFixosPage,
});

const selectCls =
  "h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const FORMAS: FormaPagamento[] = ["debito", "pix", "dinheiro", "credito"];

type FormState = {
  descricao: string;
  valor: string;
  diaVencimento: string;
  contaId: string;
  categoriaId: string;
  formaPagamento: FormaPagamento;
  ativo: boolean;
};

function emptyForm(contaId: string, categoriaId: string): FormState {
  return {
    descricao: "",
    valor: "",
    diaVencimento: "10",
    contaId,
    categoriaId,
    formaPagamento: "debito",
    ativo: true,
  };
}

function GastosFixosPage() {
  const { month, year } = usePeriod();
  const mesAlvo = month === 0 ? new Date().getMonth() + 1 : month;

  const { data: items = [], isLoading } = useGastosFixos(year);
  const { data: accounts = [] } = useContas();
  const { data: categorias = [] } = useCategorias();

  const criar = useCriarGastoFixo(year);
  const atualizar = useAtualizarGastoFixo(year);
  const excluirMutacao = useExcluirGastoFixo(year);
  const pagar = usePagarGastoFixo(year);
  const desfazer = useDesfazerGastoFixo(year);

  const contaPorId = (id: string | undefined) => accounts.find((a) => a.id === id);
  const categoriaPorId = (id: string | undefined) => categorias.find((c) => c.id === id);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GastoFixo | null>(null);
  const [form, setForm] = useState<FormState>(() =>
    emptyForm(accounts[0]?.id ?? "", categorias[0]?.id ?? ""),
  );

  function openNew() {
    setEditing(null);
    setForm(emptyForm(accounts[0]?.id ?? "", categorias[0]?.id ?? ""));
    setOpen(true);
  }

  function openEdit(gasto: GastoFixo) {
    setEditing(gasto);
    setForm({
      descricao: gasto.descricao,
      valor: String(gasto.valor),
      diaVencimento: String(gasto.diaVencimento),
      contaId: gasto.contaId,
      categoriaId: gasto.categoriaId ?? categorias[0]?.id ?? "",
      formaPagamento: gasto.formaPagamento ?? "debito",
      ativo: gasto.ativo,
    });
    setOpen(true);
  }

  function save() {
    const valor = Number(form.valor.replace(",", "."));
    if (!form.descricao.trim() || !valor || !form.contaId) {
      toast.error("Informe descrição, valor e conta válidos.");
      return;
    }
    const payload = {
      descricao: form.descricao.trim(),
      valor,
      diaVencimento: Math.min(31, Math.max(1, Number(form.diaVencimento) || 1)),
      contaId: form.contaId,
      categoriaId: form.categoriaId,
      formaPagamento: form.formaPagamento,
      ativo: form.ativo,
    };
    const mutacao = editing
      ? atualizar.mutateAsync({ id: editing.id, dados: payload })
      : criar.mutateAsync(payload);
    mutacao
      .then(() => {
        toast.success(editing ? "Gasto fixo atualizado." : "Gasto fixo criado.");
        setOpen(false);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."));
  }

  function excluir(id: string) {
    excluirMutacao
      .mutateAsync(id)
      .then(() => toast.success("Gasto fixo excluído."))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível excluir."));
  }

  // Não é um PATCH de campo — marcar/desmarcar cria ou apaga um lançamento
  // de verdade (ver especificação-técnica-funcional.md, seção 9).
  function alternarPago(gasto: GastoFixo, pago: boolean) {
    const mutacao = pago
      ? pagar.mutateAsync({ id: gasto.id, mes: mesAlvo })
      : desfazer.mutateAsync({ id: gasto.id, mes: mesAlvo });
    mutacao.catch((e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar."),
    );
  }

  const totalMes = items.filter((g) => g.ativo).reduce((a, g) => a + g.valor, 0);
  const pagoMes = items
    .filter((g) => g.ativo && g.situacoes[mesAlvo] === "pago")
    .reduce((a, g) => a + g.valor, 0);

  return (
    <AppShell
      title="Gastos Fixos"
      subtitle={`Situação de ${MONTHS[mesAlvo - 1]} de ${year}${month === 0 ? " (ano inteiro selecionado — usando o mês corrente)" : ""}`}
      actions={
        <Button onClick={openNew} className="gap-2">
          <Plus size={16} /> Novo gasto fixo
        </Button>
      }
    >
      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="border-b border-border px-4 py-3 font-medium">Pago</th>
              <th className="border-b border-border px-4 py-3 font-medium">Descrição</th>
              <th className="border-b border-border px-4 py-3 font-medium">Categoria</th>
              <th className="border-b border-border px-4 py-3 font-medium">Conta</th>
              <th className="border-b border-border px-4 py-3 font-medium">Pagamento</th>
              <th className="border-b border-border px-4 py-3 font-medium">Vencimento</th>
              <th className="border-b border-border px-4 py-3 text-right font-medium">Valor</th>
              <th className="border-b border-border px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((g) => {
              const pago = g.situacoes[mesAlvo] === "pago";
              return (
                <tr
                  key={g.id}
                  className={`transition-colors hover:bg-accent/40 ${g.ativo ? "" : "opacity-50"}`}
                >
                  <td className="border-b border-border px-4 py-3">
                    <Checkbox
                      checked={pago}
                      onCheckedChange={(v) => alternarPago(g, v === true)}
                      aria-label={`Marcar ${g.descricao} como ${pago ? "pendente" : "pago"}`}
                    />
                  </td>
                  <td className="border-b border-border px-4 py-3">{g.descricao}</td>
                  <td className="border-b border-border px-4 py-3 text-muted-foreground">
                    {categoriaPorId(g.categoriaId)?.nome ?? "—"}
                  </td>
                  <td className="border-b border-border px-4 py-3 text-muted-foreground">
                    {contaPorId(g.contaId)?.nome ?? "—"}
                  </td>
                  <td className="border-b border-border px-4 py-3 text-muted-foreground">
                    {g.formaPagamento ? ROTULO_FORMA_PAGAMENTO[g.formaPagamento] : "—"}
                  </td>
                  <td className="border-b border-border px-4 py-3 text-muted-foreground">
                    dia {g.diaVencimento}
                  </td>
                  <td className="border-b border-border px-4 py-3 text-right tabular-nums">
                    {formatBRL(g.valor)}
                  </td>
                  <td className="border-b border-border px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Editar"
                        onClick={() => openEdit(g)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir"
                        onClick={() => excluir(g.id)}
                      >
                        <Trash2 size={16} className="text-expense" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {isLoading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  Nenhum gasto fixo cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        Pago no mês: <span className="text-income">{formatBRL(pagoMes)}</span> de{" "}
        <span className="tabular-nums">{formatBRL(totalMes)}</span>
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar gasto fixo" : "Novo gasto fixo"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="gf-descricao">Descrição</Label>
              <Input
                id="gf-descricao"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex.: Aluguel"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gf-valor">Valor (R$)</Label>
              <Input
                id="gf-valor"
                inputMode="decimal"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gf-dia">Dia de vencimento</Label>
              <Input
                id="gf-dia"
                type="number"
                min={1}
                max={31}
                value={form.diaVencimento}
                onChange={(e) => setForm({ ...form, diaVencimento: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gf-conta">Conta</Label>
              <select
                id="gf-conta"
                className={selectCls}
                value={form.contaId}
                onChange={(e) => setForm({ ...form, contaId: e.target.value })}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gf-pagamento">Forma de pagamento</Label>
              <select
                id="gf-pagamento"
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
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="gf-categoria">Categoria</Label>
              <select
                id="gf-categoria"
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
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <Checkbox
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v === true })}
              />
              Ativo
            </label>
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
