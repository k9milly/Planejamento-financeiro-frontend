import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Entrar | Planejamento Financeiro" }],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setEntrando(true);
    try {
      await api.login(email.trim(), senha);
      // Bug real, achado depois do PWA (ADR-09) tirar o "disfarce" do
      // refresh manual: sem isto, `__root.tsx` continuava achando que não
      // havia sessão válida (a checagem dele é cacheada) e desfazia este
      // navigate na hora, prendendo a tela em /login. Espera a sessão ser
      // reconferida com o token novo antes de navegar — sem essa corrida.
      await queryClient.invalidateQueries({ queryKey: ["sessao"] });
      navigate({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="brand-gradient flex size-12 items-center justify-center rounded-2xl text-primary-foreground">
            <Wallet size={22} />
          </span>
          <div>
            <p className="text-lg font-semibold">Planejamento Financeiro</p>
            <p className="text-sm text-muted-foreground">Entre para ver suas finanças.</p>
          </div>
        </div>

        <form onSubmit={entrar} className="panel space-y-4 p-6">
          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={entrando}>
            {entrando ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
