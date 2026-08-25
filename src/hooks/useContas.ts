import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { TipoConta } from "@/lib/finance-data";

/** Metadados só — sem saldo/fatura (ver nota em `lib/finance-data.ts::Conta`). */
export function useContas() {
  return useQuery({
    queryKey: ["contas"],
    queryFn: () => api.listarContas(),
    staleTime: 60_000,
  });
}

export function useCriarConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: {
      nome: string;
      cor?: string;
      tipo?: TipoConta;
      diaVencimentoFatura?: number | null;
    }) => api.criarConta(dados),
    // O saldo de uma conta nova mora no resumo, não em `/contas` — invalida
    // as duas chaves (ADR-02, Fase 2, item 5).
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas"] });
      qc.invalidateQueries({ queryKey: ["resumo"] });
    },
  });
}

export function useAtualizarConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      dados,
    }: {
      id: string;
      dados: Partial<{
        nome: string;
        cor: string;
        tipo: TipoConta;
        diaVencimentoFatura: number | null;
      }>;
    }) => api.atualizarConta(id, dados),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas"] });
      qc.invalidateQueries({ queryKey: ["resumo"] });
    },
  });
}

export function useExcluirConta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.excluirConta(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas"] });
      qc.invalidateQueries({ queryKey: ["resumo"] });
    },
  });
}
