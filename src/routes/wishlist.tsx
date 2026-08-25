import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/finance/AppShell";
import { usePeriod } from "@/components/finance/period-context";
import { useResumo } from "@/hooks/useResumo";
import {
  useAtualizarDesejo,
  useCriarDesejo,
  useExcluirDesejo,
  useWishlist,
  useWishlistTotal,
} from "@/hooks/useWishlist";
import { formatBRL, type Desejo, type Importancia } from "@/lib/finance-data";
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

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist | Planejamento Financeiro" },
      {
        name: "description",
        content: "Lista de desejos, com prioridade e comparação com o total guardado.",
      },
      { property: "og:title", content: "Wishlist | Planejamento Financeiro" },
      {
        property: "og:description",
        content: "Planeje suas próximas compras contra a reserva guardada.",
      },
    ],
  }),
  component: WishlistPage,
});

const selectCls =
  "h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

const ROTULO_IMPORTANCIA: Record<Importancia, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};
const TONE_IMPORTANCIA: Record<Importancia, string> = {
  alta: "bg-expense-soft text-expense",
  media: "bg-accent text-accent-foreground",
  baixa: "bg-surface-2 text-muted-foreground",
};

type FormState = { desejo: string; valor: string; importancia: Importancia; somar: boolean };

function emptyForm(): FormState {
  return { desejo: "", valor: "", importancia: "media", somar: true };
}

function WishlistPage() {
  const { year } = usePeriod();
  const { data: items = [], isLoading } = useWishlist(year);
  const { data: total } = useWishlistTotal(year);
  const { data: resumo } = useResumo(year);

  const criar = useCriarDesejo(year);
  const atualizar = useAtualizarDesejo(year);
  const excluirMutacao = useExcluirDesejo(year);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Desejo | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  // "Total guardado" não tem endpoint próprio — é a soma do `guardado` de
  // cada conta corrente, que o resumo (usado no Dashboard) já traz pronta.
  const totalGuardado = (resumo?.porConta ?? []).reduce((a, c) => a + c.guardado, 0);
  const totalMarcado = total?.totalMarcado ?? 0;

  function openNew() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(desejo: Desejo) {
    setEditing(desejo);
    setForm({
      desejo: desejo.desejo,
      valor: String(desejo.valor),
      importancia: desejo.importancia,
      somar: desejo.somar,
    });
    setOpen(true);
  }

  function save() {
    const valor = Number(form.valor.replace(",", "."));
    if (!form.desejo.trim() || !valor) {
      toast.error("Informe o desejo e um valor válido.");
      return;
    }
    const payload = {
      desejo: form.desejo.trim(),
      valor,
      importancia: form.importancia,
      somar: form.somar,
    };
    const mutacao = editing
      ? atualizar.mutateAsync({ id: editing.id, dados: payload })
      : criar.mutateAsync(payload);
    mutacao
      .then(() => {
        toast.success(editing ? "Desejo atualizado." : "Desejo adicionado.");
        setOpen(false);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar."));
  }

  function alternarSomar(desejo: Desejo, somar: boolean) {
    atualizar
      .mutateAsync({ id: desejo.id, dados: { somar } })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível atualizar."));
  }

  function alternarComprado(desejo: Desejo) {
    atualizar
      .mutateAsync({ id: desejo.id, dados: { comprado: !desejo.comprado } })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível atualizar."));
  }

  function excluir(id: string) {
    excluirMutacao
      .mutateAsync(id)
      .then(() => toast.success("Desejo removido."))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível excluir."));
  }

  const ordenados = [...items].sort((a, b) => {
    const ordem: Record<Importancia, number> = { alta: 0, media: 1, baixa: 2 };
    if (a.comprado !== b.comprado) return a.comprado ? 1 : -1;
    return ordem[a.importancia] - ordem[b.importancia];
  });

  return (
    <AppShell
      title="Wishlist"
      subtitle="O que você quer comprar, comparado com o que já tem guardado"
      actions={
        <Button onClick={openNew} className="gap-2">
          <Plus size={16} /> Novo desejo
        </Button>
      }
    >
      <div className="panel divide-y divide-border">
        {ordenados.map((d) => (
          <div
            key={d.id}
            className={`flex items-center gap-3 px-5 py-3.5 text-sm ${d.comprado ? "opacity-50" : ""}`}
          >
            <Checkbox
              checked={d.somar}
              onCheckedChange={(v) => alternarSomar(d, v === true)}
              aria-label="Somar no total"
              title="Somar no total"
            />
            <span className={`min-w-0 flex-1 truncate ${d.comprado ? "line-through" : ""}`}>
              {d.desejo}
            </span>
            <span className={`rounded-full px-2.5 py-1 text-xs ${TONE_IMPORTANCIA[d.importancia]}`}>
              {ROTULO_IMPORTANCIA[d.importancia]}
            </span>
            <span className="w-28 text-right tabular-nums">{formatBRL(d.valor)}</span>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label={d.comprado ? "Marcar como não comprado" : "Marcar como comprado"}
                onClick={() => alternarComprado(d)}
              >
                <Check size={16} className={d.comprado ? "text-income" : ""} />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => openEdit(d)}>
                <Pencil size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir"
                onClick={() => excluir(d.id)}
              >
                <Trash2 size={16} className="text-expense" />
              </Button>
            </div>
          </div>
        ))}
        {isLoading && <p className="px-5 py-10 text-center text-muted-foreground">Carregando…</p>}
        {!isLoading && items.length === 0 && (
          <p className="px-5 py-10 text-center text-muted-foreground">
            Nenhum desejo cadastrado ainda.
          </p>
        )}
      </div>

      <div className="panel mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <p className="text-xs text-muted-foreground">Selecionado (marcados, não comprados)</p>
          <p className="text-xl font-semibold tabular-nums">{formatBRL(totalMarcado)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Total guardado</p>
          <p className="text-xl font-semibold tabular-nums text-income">
            {formatBRL(totalGuardado)}
          </p>
        </div>
        <p className="w-full text-xs text-muted-foreground">
          {totalMarcado > totalGuardado
            ? `Faltam ${formatBRL(totalMarcado - totalGuardado)} no guardado.`
            : "Dá para comprar tudo o que está marcado com o guardado atual."}
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar desejo" : "Novo desejo"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="w-desejo">Desejo</Label>
              <Input
                id="w-desejo"
                value={form.desejo}
                onChange={(e) => setForm({ ...form, desejo: e.target.value })}
                placeholder="Ex.: Fone com cancelamento de ruído"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="w-valor">Valor (R$)</Label>
              <Input
                id="w-valor"
                inputMode="decimal"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="w-importancia">Importância</Label>
              <select
                id="w-importancia"
                className={selectCls}
                value={form.importancia}
                onChange={(e) => setForm({ ...form, importancia: e.target.value as Importancia })}
              >
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.somar}
                onCheckedChange={(v) => setForm({ ...form, somar: v === true })}
              />
              Somar no total
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
