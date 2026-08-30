import { useState } from "react";
import { Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  useCriarMetaPoupanca,
  useExcluirMetaPoupanca,
  useMetasAtivas,
} from "@/hooks/useMetasPoupanca";
import type { TipoMetaPoupanca } from "@/lib/api-client";
import { formatBRL } from "@/lib/finance-data";
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

const selectCls =
  "h-9 rounded-lg border border-border bg-surface-2 px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function Bar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className="h-full rounded-full bg-primary"
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

type FormState = { tipo: TipoMetaPoupanca; valorAlvo: string; dataAlvo: string };

function emptyForm(): FormState {
  return { tipo: "mensal", valorAlvo: "", dataAlvo: "" };
}

/**
 * Metas de poupança (ADR-06) — as duas formas (mensal e com prazo) podem
 * estar ativas ao mesmo tempo; o progresso vem pronto do backend, nunca
 * resomado aqui. Mora em Configurações → Perfil e em `/metas` (mesma
 * entidade, mesmo componente — não duplicar a lógica em dois lugares).
 */
export function MetaPoupancaSection() {
  const { data, isLoading } = useMetasAtivas();
  const criar = useCriarMetaPoupanca();
  const excluir = useExcluirMetaPoupanca();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  function openNew() {
    // Sugere o tipo que ainda não tem meta ativa — criar do mesmo tipo que
    // já existe é uma operação válida (substitui a anterior), só não é o
    // caso mais comum de abrir o formulário.
    setForm({ ...emptyForm(), tipo: data?.mensal ? "prazo" : "mensal" });
    setOpen(true);
  }

  function salvar() {
    const valorAlvo = Number(form.valorAlvo.replace(",", "."));
    if (!valorAlvo || valorAlvo <= 0) {
      toast.error("Informe um valor-alvo válido.");
      return;
    }
    if (form.tipo === "prazo" && !form.dataAlvo) {
      toast.error("Meta com prazo precisa de uma data-alvo.");
      return;
    }
    criar
      .mutateAsync({
        tipo: form.tipo,
        valorAlvo,
        ...(form.tipo === "prazo" ? { dataAlvo: form.dataAlvo } : {}),
      })
      .then(() => {
        toast.success("Meta criada.");
        setOpen(false);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível criar a meta."));
  }

  function remover(id: string) {
    excluir
      .mutateAsync(id)
      .then(() => toast.success("Meta desativada."))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Não foi possível desativar."));
  }

  const semNenhuma = !isLoading && !data?.mensal && !data?.prazo;

  return (
    <section className="panel p-5">
      <header className="mb-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-primary" />
          <h2 className="text-base font-semibold">Meta de poupança</h2>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={openNew}>
          <Plus size={14} /> Nova meta
        </Button>
      </header>

      <div className="space-y-5">
        {data?.mensal && (
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Meta mensal</span>
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-muted-foreground">
                  {formatBRL(data.mensal.guardadoNoMes)} / {formatBRL(data.mensal.valorAlvo)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Desativar meta mensal"
                  onClick={() => remover(data.mensal!.id)}
                >
                  <Trash2 size={14} className="text-expense" />
                </Button>
              </div>
            </div>
            <Bar percent={data.mensal.percentual} />
            <p className="mt-1 text-xs text-muted-foreground">
              {data.mensal.percentual.toFixed(0)}% guardado este mês
            </p>
          </div>
        )}

        {data?.prazo && (
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>Meta com prazo</span>
              <div className="flex items-center gap-2">
                <span className="tabular-nums text-muted-foreground">
                  {formatBRL(data.prazo.guardadoAcumulado)} / {formatBRL(data.prazo.valorAlvo)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Desativar meta com prazo"
                  onClick={() => remover(data.prazo!.id)}
                >
                  <Trash2 size={14} className="text-expense" />
                </Button>
              </div>
            </div>
            <Bar percent={data.prazo.percentual} />
            <p className="mt-1 text-xs text-muted-foreground">
              {data.prazo.percentual.toFixed(0)}% concluído •{" "}
              {data.prazo.diasRestantes >= 0
                ? `faltam ${data.prazo.diasRestantes} dias`
                : `${Math.abs(data.prazo.diasRestantes)} dias em atraso`}
            </p>
          </div>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
        {semNenhuma && (
          <p className="text-sm text-muted-foreground">
            Nenhuma meta ativa — crie uma meta mensal ou com prazo.
          </p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>
              {form.tipo === "mensal" ? "Nova meta mensal" : "Nova meta com prazo"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="meta-tipo">Tipo</Label>
              <select
                id="meta-tipo"
                className={selectCls}
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoMetaPoupanca })}
              >
                <option value="mensal">Mensal (recorrente)</option>
                <option value="prazo">Com prazo</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="meta-valor">Valor-alvo (R$)</Label>
              <Input
                id="meta-valor"
                inputMode="decimal"
                value={form.valorAlvo}
                onChange={(e) => setForm({ ...form, valorAlvo: e.target.value })}
              />
            </div>
            {form.tipo === "prazo" && (
              <div className="grid gap-2">
                <Label htmlFor="meta-data">Data-alvo</Label>
                <Input
                  id="meta-data"
                  type="date"
                  value={form.dataAlvo}
                  onChange={(e) => setForm({ ...form, dataAlvo: e.target.value })}
                />
              </div>
            )}
            {((form.tipo === "mensal" && data?.mensal) ||
              (form.tipo === "prazo" && data?.prazo)) && (
              <p className="text-xs text-muted-foreground">
                Já existe uma meta {form.tipo === "mensal" ? "mensal" : "com prazo"} ativa — criar
                esta substitui a anterior (o histórico continua guardado).
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={criar.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
