import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CreditCard, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/finance/AppShell";
import { usePeriod } from "@/components/finance/period-context";
import {
  useAtualizarCategoria,
  useCategorias,
  useCriarCategoria,
  useExcluirCategoria,
} from "@/hooks/useCategorias";
import { useAtualizarConta, useContas, useCriarConta, useExcluirConta } from "@/hooks/useContas";
import { useDesfazerFatura, useFatura, usePagarFatura } from "@/hooks/useFatura";
import { useResumo } from "@/hooks/useResumo";
import { api } from "@/lib/api-client";
import { formatBRL, type Categoria, type Conta, type TipoConta } from "@/lib/finance-data";
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
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações | Planejamento Financeiro" },
      {
        name: "description",
        content: "Preferências de conta, contas e categorias do seu planejamento.",
      },
      { property: "og:title", content: "Configurações | Planejamento Financeiro" },
      { property: "og:description", content: "Ajuste contas e categorias." },
    ],
  }),
  component: ConfigPage,
});

const selectCls =
  "h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function ConfigPage() {
  return (
    <AppShell title="Configurações" subtitle="Preferências da sua conta">
      <div className="grid gap-4 lg:grid-cols-2">
        <PerfilSection />
        <ContasSection />
        <CategoriasSection />
      </div>
    </AppShell>
  );
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

/**
 * Reduzida ao que a API sustenta hoje (Fase 7 do PLANO-FRONTEND.md,
 * decisão da especificação, seção 6): `GET /auth/eu` só devolve `id` e
 * `email` — não há endpoint de nome, meta de poupança nem preferências de
 * alerta. Mostrar campos que não persistem em lugar nenhum simularia uma
 * funcionalidade que não existe; o e-mail somente leitura é o que é real.
 */
function PerfilSection() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    api.eu().then((u) => setEmail(u.email));
  }, []);

  return (
    <section className="panel p-5">
      <h2 className="mb-4 text-base font-semibold">Perfil</h2>
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" value={email ?? "carregando…"} readOnly disabled />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Nome, meta de poupança e alertas ainda não existem no backend — nada é mostrado aqui que não
        persista de verdade.
      </p>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Contas
// ---------------------------------------------------------------------------

type ContaForm = {
  nome: string;
  cor: string;
  tipo: TipoConta;
  diaVencimentoFatura: string;
};

function emptyContaForm(): ContaForm {
  return { nome: "", cor: "#820ad1", tipo: "corrente", diaVencimentoFatura: "10" };
}

/** Junta a conta (metadados, `useContas`) com o saldo do resumo — `GET /contas` não tem saldo. */
function comSaldo(conta: Conta, porConta: { contaId: string; saldo: number }[]): Conta {
  const achou = porConta.find((c) => c.contaId === conta.id);
  return achou ? { ...conta, saldo: achou.saldo } : conta;
}

function ContasSection() {
  const { year } = usePeriod();
  const { data: contas, isLoading } = useContas();
  const { data: resumo } = useResumo(year);
  const criar = useCriarConta();
  const atualizar = useAtualizarConta();
  const excluir = useExcluirConta();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Conta | null>(null);
  const [form, setForm] = useState<ContaForm>(emptyContaForm());
  const [pagando, setPagando] = useState<Conta | null>(null);

  const contasCorrentes = (contas ?? []).filter((c) => c.tipo === "corrente");
  const contasComSaldo = (contas ?? []).map((c) => comSaldo(c, resumo?.porConta ?? []));
  const cartoesComFatura = (contas ?? [])
    .filter((c) => c.tipo === "cartao_credito")
    .map((c) =>
      comSaldo(
        c,
        (resumo?.porCartao ?? []).map((p) => ({ ...p, saldo: -p.saldo })),
      ),
    );

  function openNew() {
    setEditing(null);
    setForm(emptyContaForm());
    setOpen(true);
  }

  function openEdit(conta: Conta) {
    setEditing(conta);
    setForm({
      nome: conta.nome,
      cor: conta.cor,
      tipo: conta.tipo,
      diaVencimentoFatura: String(conta.diaVencimentoFatura ?? 10),
    });
    setOpen(true);
  }

  function save() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome da conta.");
      return;
    }
    const ehCartao = form.tipo === "cartao_credito";
    const payload = {
      nome: form.nome.trim(),
      cor: form.cor,
      tipo: form.tipo,
      diaVencimentoFatura: ehCartao ? Number(form.diaVencimentoFatura) || 10 : null,
    };
    const mutacao = editing
      ? atualizar.mutateAsync({ id: editing.id, dados: payload })
      : criar.mutateAsync(payload);
    mutacao
      .then(() => {
        toast.success(editing ? "Conta atualizada." : "Conta criada.");
        setOpen(false);
      })
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Não foi possível salvar a conta."),
      );
  }

  function excluirConta(conta: Conta) {
    excluir
      .mutateAsync(conta.id)
      .then(() => toast.success("Conta excluída."))
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Não foi possível excluir a conta."),
      );
  }

  return (
    <section className="panel p-5 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Contas</h2>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus size={16} /> Nova conta
        </Button>
      </div>

      <ul className="divide-y divide-border">
        {isLoading && (
          <li className="py-6 text-center text-sm text-muted-foreground">Carregando…</li>
        )}
        {contasComSaldo
          .filter((c) => c.tipo === "corrente")
          .map((conta) => (
            <li key={conta.id} className="flex items-center gap-3 py-3 text-sm">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${conta.cor}26`, color: conta.cor }}
              >
                <Wallet size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{conta.nome}</p>
                <p className="text-xs text-muted-foreground">Conta corrente</p>
              </div>
              <div className="text-right">
                <p className="tabular-nums text-income">{formatBRL(conta.saldo ?? 0)}</p>
                <p className="text-xs text-muted-foreground">saldo disponível</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar conta"
                  onClick={() => openEdit(conta)}
                >
                  <Pencil size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir conta"
                  onClick={() => excluirConta(conta)}
                >
                  <Trash2 size={16} className="text-expense" />
                </Button>
              </div>
            </li>
          ))}
        {cartoesComFatura.map((cartao) => (
          <CartaoLinha
            key={cartao.id}
            cartao={cartao}
            ano={year}
            onEditar={() => openEdit(cartao)}
            onExcluir={() => excluirConta(cartao)}
            onPagar={() => setPagando(cartao)}
          />
        ))}
        {!isLoading && (contas ?? []).length === 0 && (
          <li className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma conta cadastrada.
          </li>
        )}
      </ul>

      <p className="mt-3 text-xs text-muted-foreground">
        Saldo inteligente: fatura em aberto é uma dívida (cor de despesa) e nunca entra somada ao
        saldo disponível (cor de receita).
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar conta" : "Nova conta"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2 sm:col-span-2">
              <Label htmlFor="conta-nome">Nome</Label>
              <Input
                id="conta-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Nubank"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="conta-cor">Cor</Label>
              <Input
                id="conta-cor"
                type="color"
                value={form.cor}
                onChange={(e) => setForm({ ...form, cor: e.target.value })}
                className="h-9 w-full p-1"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="conta-tipo">Tipo</Label>
              <select
                id="conta-tipo"
                className={selectCls}
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoConta })}
              >
                <option value="corrente">Conta corrente</option>
                <option value="cartao_credito">Cartão de crédito</option>
              </select>
            </div>
            {form.tipo === "cartao_credito" && (
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="conta-dia">Dia de vencimento</Label>
                <Input
                  id="conta-dia"
                  type="number"
                  min={1}
                  max={31}
                  value={form.diaVencimentoFatura}
                  onChange={(e) => setForm({ ...form, diaVencimentoFatura: e.target.value })}
                />
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

      {pagando && (
        <PagarFaturaDialog
          cartao={pagando}
          ano={year}
          contasCorrentes={contasCorrentes}
          onFechar={() => setPagando(null)}
        />
      )}
    </section>
  );
}

/** Uma linha de cartão: precisa da fatura do mês, então mora num componente
 * próprio — chamar `useFatura` dentro de um `.map()` no componente pai
 * violaria as Rules of Hooks (número de hooks mudaria a cada conta). */
function CartaoLinha({
  cartao,
  ano,
  onEditar,
  onExcluir,
  onPagar,
}: {
  cartao: Conta;
  ano: number;
  onEditar: () => void;
  onExcluir: () => void;
  onPagar: () => void;
}) {
  const { month } = usePeriod();
  const mes = month === 0 ? new Date().getMonth() + 1 : month;
  const { data: fatura } = useFatura(ano, cartao.id, mes);
  const paga = fatura?.situacao === "pago";

  return (
    <li className="flex items-center gap-3 py-3 text-sm">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${cartao.cor}26`, color: cartao.cor }}
      >
        <CreditCard size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{cartao.nome}</p>
        <p className="text-xs text-muted-foreground">
          Cartão de crédito • vence dia {cartao.diaVencimentoFatura}
        </p>
      </div>
      <div className="text-right">
        <p className="tabular-nums text-expense">
          {formatBRL(fatura?.valorEmAberto ?? cartao.saldo ?? 0)}
        </p>
        <p className="text-xs text-muted-foreground">
          fatura em aberto •{" "}
          <span className={paga ? "text-income" : "text-muted-foreground"}>
            {paga ? "paga" : "pendente"}
          </span>
        </p>
      </div>
      {!paga && (
        <Button size="sm" variant="secondary" onClick={onPagar}>
          Pagar fatura
        </Button>
      )}
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" aria-label="Editar conta" onClick={onEditar}>
          <Pencil size={16} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Excluir conta" onClick={onExcluir}>
          <Trash2 size={16} className="text-expense" />
        </Button>
      </div>
    </li>
  );
}

function PagarFaturaDialog({
  cartao,
  ano,
  contasCorrentes,
  onFechar,
}: {
  cartao: Conta;
  ano: number;
  contasCorrentes: Conta[];
  onFechar: () => void;
}) {
  const { month } = usePeriod();
  const mes = month === 0 ? new Date().getMonth() + 1 : month;
  const { data: fatura } = useFatura(ano, cartao.id, mes);
  const pagar = usePagarFatura(ano);
  const [contaPagamentoId, setContaPagamentoId] = useState(contasCorrentes[0]?.id ?? "");

  function confirmar() {
    pagar
      .mutateAsync({
        cartaoId: cartao.id,
        mes,
        ...(contaPagamentoId ? { contaPagamentoId } : {}),
      })
      .then(() => {
        toast.success(`Fatura da ${cartao.nome} paga.`);
        onFechar();
      })
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Não foi possível pagar a fatura."),
      );
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="bg-card">
        <DialogHeader>
          <DialogTitle>Pagar fatura — {cartao.nome}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Valor em aberto:{" "}
          <span className="font-medium text-expense">{formatBRL(fatura?.valorEmAberto ?? 0)}</span>.
        </p>
        <div className="grid gap-2">
          <Label htmlFor="conta-pagamento">De qual conta sai o pagamento?</Label>
          <select
            id="conta-pagamento"
            className={selectCls}
            value={contaPagamentoId}
            onChange={(e) => setContaPagamentoId(e.target.value)}
          >
            {contasCorrentes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onFechar}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={pagar.isPending}>
            Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

type CategoriaForm = { nome: string; cor: string; ativa: boolean };

function emptyCategoriaForm(): CategoriaForm {
  return { nome: "", cor: "#8b5cf6", ativa: true };
}

function CategoriasSection() {
  const { data: categorias, isLoading } = useCategorias();
  const criar = useCriarCategoria();
  const atualizar = useAtualizarCategoria();
  const excluir = useExcluirCategoria();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [form, setForm] = useState<CategoriaForm>(emptyCategoriaForm());

  function openNew() {
    setEditing(null);
    setForm(emptyCategoriaForm());
    setOpen(true);
  }

  function openEdit(categoria: Categoria) {
    setEditing(categoria);
    setForm({ nome: categoria.nome, cor: categoria.cor, ativa: categoria.ativa });
    setOpen(true);
  }

  function save() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    const mutacao = editing
      ? atualizar.mutateAsync({ id: editing.id, dados: form })
      : criar.mutateAsync(form);
    mutacao
      .then(() => {
        toast.success(editing ? "Categoria atualizada." : "Categoria criada.");
        setOpen(false);
      })
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Não foi possível salvar a categoria."),
      );
  }

  function mudarAtiva(categoria: Categoria, ativa: boolean) {
    atualizar
      .mutateAsync({ id: categoria.id, dados: { ativa } })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível atualizar."));
  }

  function excluirCategoria(categoria: Categoria) {
    excluir
      .mutateAsync(categoria.id)
      .then(() => toast.success("Categoria excluída."))
      .catch((e) =>
        toast.error(e instanceof Error ? e.message : "Não foi possível excluir a categoria."),
      );
  }

  return (
    <section className="panel p-5 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Categorias</h2>
        <Button size="sm" onClick={openNew} className="gap-2">
          <Plus size={16} /> Nova categoria
        </Button>
      </div>

      <ul className="divide-y divide-border">
        {isLoading && (
          <li className="py-6 text-center text-sm text-muted-foreground">Carregando…</li>
        )}
        {(categorias ?? []).map((categoria) => (
          <li key={categoria.id} className="flex items-center gap-3 py-2.5 text-sm">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: categoria.cor }}
            />
            <span
              className={`flex-1 truncate ${categoria.ativa ? "" : "text-muted-foreground line-through"}`}
            >
              {categoria.nome}
            </span>
            <Switch
              checked={categoria.ativa}
              onCheckedChange={(ativa) => mudarAtiva(categoria, ativa)}
              aria-label={categoria.ativa ? "Marcar como inativa" : "Marcar como ativa"}
            />
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Editar categoria"
                onClick={() => openEdit(categoria)}
              >
                <Pencil size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir categoria"
                onClick={() => excluirCategoria(categoria)}
              >
                <Trash2 size={16} className="text-expense" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-nome">Nome</Label>
              <Input
                id="cat-nome"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex.: Pets"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-cor">Cor</Label>
              <Input
                id="cat-cor"
                type="color"
                value={form.cor}
                onChange={(e) => setForm({ ...form, cor: e.target.value })}
                className="h-9 w-full p-1"
              />
            </div>
            <label className="flex items-center justify-between text-sm">
              Ativa
              <Switch
                checked={form.ativa}
                onCheckedChange={(ativa) => setForm({ ...form, ativa })}
              />
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
    </section>
  );
}
