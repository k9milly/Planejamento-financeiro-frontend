import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useCategorias() {
  return useQuery({
    queryKey: ["categorias"],
    queryFn: api.listarCategorias,
    staleTime: 60_000,
  });
}

export function useCriarCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { nome: string; cor?: string; limiteMensal?: number }) =>
      api.criarCategoria(dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  });
}

export function useAtualizarCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      dados,
    }: {
      id: string;
      dados: Partial<{ nome: string; cor: string; ativa: boolean; limiteMensal: number | null }>;
    }) => api.atualizarCategoria(id, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  });
}

export function useExcluirCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.excluirCategoria(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  });
}
