import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeftRight, PiggyBank, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/finance/AppShell";
import { usePeriod } from "@/components/finance/period-context";
import {
  useAtualizarCaixinha,
  useCaixinhas,
  useCriarCaixinha,
  useExcluirCaixinha,
  useTransferirCaixinha,
} from "@/hooks/useCaixinhas";
import { useContas } from "@/hooks/useContas";
import { useMetasAtivas, useMetasPoupancaLista } from "@/hooks/useMetasPoupanca";
import { useResumo } from "@/hooks/useResumo";
import { formatBRL, type Caixinha, type Conta } from "@/lib/finance-data";
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

export const Route = createFileRoute("/investimentos")({
  head: () => ({
    meta: [
      { title: "Investimentos | Planejamento Financeiro" },
      {
        name: "description",
        content: "Caixinhas da reserva, por conta — organize o que já está guardado.",
      },
      { property: "og:title", content: "Investimentos | Planejamento Financeiro" },
      {
        property: "og:description",
        content: "Crie caixinhas nomeadas, vincule a metas e transfira entre elas.",
      },
    ],
  }),
  component: InvestimentosPage,
});

const selectCls =
  "h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function Bar({ percent }: { percent: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

function InvestimentosPage() {
  const { year } = usePeriod();
  const { data: contas = [], isLoading } = useContas();
  const contasCorrente = contas.filter((c) => c.tipo === "corrente");

  return (
    <AppShell title="Investimentos" subtitle="As caixinhas da sua reserva, por conta">
      <div className="grid gap-4">
        {contasCorrente.map((conta) => (
          <ContaCaixinhasGrupo key={conta.id} conta={conta} year={year} />
        ))}
        {!isLoading && contasCorrente.length === 0 && (
          <p className="panel p-5 text-sm text-muted-foreground">
            Nenhuma conta corrente cadastrada ainda — caixinhas moram numa conta (Configurações →
            Contas).
          </p>
        )}
      </div>
    </AppShell>
  );
}

type FormCaixinha = { nome: string; metaId: string; saldoInicial: string };

function emptyForm(): FormCaixinha {
  return { nome: "", metaId: "", saldoInicial: "" };
}

function ContaCaixinhasGrupo({ conta, year }: { conta: Conta; year: number }) {
  const { data: caixinhas = [], isLoading } = useCaixinhas(conta.id);
  const { data: metasAtivas } = useMetasAtivas();
  const { data: metasLista = [] } = useMetasPoupancaLista();
  const { data: resumo } = useResumo(year);

  const criar = useCriarCaixinha(conta.id);
  const atualizar = useAtualizarCaixinha(conta.id);
  const excluir = useExcluirCaixinha(conta.id);
  const transferir = useTransferirCaixinha(conta.id);

  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Caixinha | null>(null);
  const [form, setForm] = useState<FormCaixinha>(emptyForm());
  const [transferOpen, setTransferOpen] = useState(false);
  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [valorTransferir, setValorTransferir] = useState("");

  const guardadoDaConta = resumo?.porConta.find((c) => c.contaId === conta.id)?.guardado ?? 0;
  const somaCaixinhas = caixinhas.reduce((a, c) => a + c.saldo, 0);
  const semCaixinha = guardadoDaConta - somaCaixinhas;

  function progressoDaMeta(metaId: string | undefined) {
    if (!metaId) return null;
    if (metasAtivas?.mensal?.id === metaId) {
      return { percentual: metasAtivas.mensal.percentual, rotulo: "meta mensal" };
    }
    if (metasAtivas?.prazo?.id === metaId) {
      return { percentual: metasAtivas.prazo.percentual, rotulo: "meta com prazo" };
    }
    return null;
  }

  function openNew() {
    setEditando(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(caixinha: Caixinha) {
    setEditando(caixinha);
    setForm({ nome: caixinha.nome, metaId: caixinha.metaId ?? "", saldoInicial: "" });
    setOpen(true);
  }

  function salvar() {
    if (!form.nome.trim()) {
      toast.error("Dê um nome pra caixinha.");
      return;
    }
    if (editando) {
      atualizar
        .mutateAsync({
          id: editando.id,
          dados: { nome: form.nome.trim(), metaId: form.metaId || null },
        })
        .then(() => {
          toast.success("Caixinha atualizada.");
          setOpen(false);
        })
        .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."));
      return;
    }
    const saldoInicial = form.saldoInicial ? Number(form.saldoInicial.replace(",", ".")) : 0;
    criar
      .mutateAsync({
        nome: form.nome.trim(),
        ...(form.metaId ? { metaId: form.metaId } : {}),
        ...(saldoInicial > 0 ? { saldoInicial } : {}),
      })
      .then(() => {
        toast.success("Caixinha criada.");
        setOpen(false);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível criar."));
  }

  function desativar(id: string) {
    excluir
      .mutateAsync(id)
      .then(() => toast.success('Caixinha desativada — o saldo voltou pra "sem caixinha".'))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível desativar."));
  }

  function abrirTransferencia() {
    setOrigemId(caixinhas[0]?.id ?? "");
    setDestinoId(caixinhas[1]?.id ?? "");
    setValorTransferir("");
    setTransferOpen(true);
  }

  function confirmarTransferencia() {
    const valor = Number(valorTransferir.replace(",", "."));
    if (!origemId || !destinoId) {
      toast.error("Escolha as duas caixinhas.");
      return;
    }
    if (origemId === destinoId) {
      toast.error("A caixinha de destino precisa ser diferente da de origem.");
      return;
    }
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }
    transferir
      .mutateAsync({ caixinhaOrigemId: origemId, caixinhaDestinoId: destinoId, valor })
      .then(() => {
        toast.success("Transferência feita.");
        setTransferOpen(false);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível transferir."));
  }

  return (
    <section className="panel p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex size-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${conta.cor}26`, color: conta.cor }}
          >
            <PiggyBank size={15} />
          </span>
          <div>
            <h2 className="text-base font-semibold">{conta.nome}</h2>
            <p className="text-xs text-muted-foreground">
              {formatBRL(guardadoDaConta)} guardados no total
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {caixinhas.length >= 2 && (
            <Button variant="outline" size="sm" className="gap-1" onClick={abrirTransferencia}>
              <ArrowLeftRight size={14} /> Transferir
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1" onClick={openNew}>
            <Plus size={14} /> Nova caixinha
          </Button>
        </div>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {!isLoading && caixinhas.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nenhuma caixinha ainda — o guardado desta conta fica todo "sem caixinha" até você criar
          uma.
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {caixinhas.map((c) => {
          const progresso = progressoDaMeta(c.metaId);
          return (
            <li key={c.id} className="rounded-xl border border-border bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium">{c.nome}</p>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Editar ${c.nome}`}
                    onClick={() => openEdit(c)}
                    className="size-7"
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Desativar ${c.nome}`}
                    onClick={() => desativar(c.id)}
                    className="size-7"
                  >
                    <Trash2 size={13} className="text-expense" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-xl font-semibold tabular-nums text-income">
                {formatBRL(c.saldo)}
              </p>
              {progresso && (
                <div className="mt-2">
                  <Bar percent={progresso.percentual} />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {progresso.percentual.toFixed(0)}% da {progresso.rotulo}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {caixinhas.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {semCaixinha > 0
            ? `${formatBRL(semCaixinha)} ainda sem caixinha nesta conta.`
            : "Todo o guardado desta conta já está organizado em caixinhas."}
        </p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar caixinha" : "Nova caixinha"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cx-nome">Nome</Label>
              <Input
                id="cx-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Fatura do cartão"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cx-meta">Vincular a uma meta (opcional)</Label>
              <select
                id="cx-meta"
                className={selectCls}
                value={form.metaId}
                onChange={(e) => setForm({ ...form, metaId: e.target.value })}
              >
                <option value="">Nenhuma</option>
                {metasLista.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.tipo === "mensal" ? "Meta mensal" : "Meta com prazo"} —{" "}
                    {formatBRL(m.valorAlvo)}
                  </option>
                ))}
              </select>
            </div>
            {!editando && (
              <div className="grid gap-2">
                <Label htmlFor="cx-saldo">Saldo inicial (opcional)</Label>
                <Input
                  id="cx-saldo"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.saldoInicial}
                  onChange={(e) => setForm({ ...form, saldoInicial: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Pra dar nome a dinheiro que já está guardado. Até {formatBRL(semCaixinha)}{" "}
                  disponível sem caixinha nesta conta.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={criar.isPending || atualizar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Transferir entre caixinhas</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cx-origem">De</Label>
              <select
                id="cx-origem"
                className={selectCls}
                value={origemId}
                onChange={(e) => setOrigemId(e.target.value)}
              >
                {caixinhas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome} ({formatBRL(c.saldo)})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cx-destino">Para</Label>
              <select
                id="cx-destino"
                className={selectCls}
                value={destinoId}
                onChange={(e) => setDestinoId(e.target.value)}
              >
                {caixinhas
                  .filter((c) => c.id !== origemId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({formatBRL(c.saldo)})
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cx-valor">Valor (R$)</Label>
              <Input
                id="cx-valor"
                inputMode="decimal"
                placeholder="0,00"
                value={valorTransferir}
                onChange={(e) => setValorTransferir(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTransferOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarTransferencia} disabled={transferir.isPending}>
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
