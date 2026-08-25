import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Lancamento, TipoLancamento } from "@/lib/finance-data";

export interface FiltrosLancamentos {
  mes?: number;
  tipo?: TipoLancamento;
  categoriaId?: string;
  contaId?: string;
}

export function useLancamentos(ano: number, filtros?: FiltrosLancamentos) {
  return useQuery({
    queryKey: ["lancamentos", ano, filtros ?? {}],
    queryFn: () => api.listarLancamentos(ano, filtros),
  });
}

/** Mutação de escrita invalida lançamentos **e** resumo — todo lançamento muda algum total. */
function invalidarTudo(qc: ReturnType<typeof useQueryClient>, ano: number) {
  qc.invalidateQueries({ queryKey: ["lancamentos", ano] });
  qc.invalidateQueries({ queryKey: ["resumo", ano] });
}

export function useCriarLancamento(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: Omit<Lancamento, "id">) => api.criarLancamento(ano, dados),
    onSuccess: () => invalidarTudo(qc, ano),
  });
}

export function useAtualizarLancamento(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Omit<Lancamento, "id"> }) =>
      api.atualizarLancamento(ano, id, dados),
    onSuccess: () => invalidarTudo(qc, ano),
  });
}

export function useExcluirLancamento(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.excluirLancamento(ano, id),
    onSuccess: () => invalidarTudo(qc, ano),
  });
}
