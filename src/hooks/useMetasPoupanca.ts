import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type TipoMetaPoupanca } from "@/lib/api-client";

/** Global, não por ano (ADR-06) — só o progresso é medido contra o ano corrente. */
export function useMetasAtivas() {
  return useQuery({
    queryKey: ["metas-poupanca", "ativas"],
    queryFn: api.metasAtivas,
  });
}

export function useCriarMetaPoupanca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { tipo: TipoMetaPoupanca; valorAlvo: number; dataAlvo?: string }) =>
      api.criarMetaPoupanca(dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metas-poupanca"] }),
  });
}

export function useExcluirMetaPoupanca() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.excluirMetaPoupanca(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metas-poupanca"] }),
  });
}
