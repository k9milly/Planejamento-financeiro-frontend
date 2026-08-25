import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Categoria } from "@/lib/finance-data";

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
    mutationFn: ({ nome, cor }: { nome: string; cor?: string }) => api.criarCategoria(nome, cor),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  });
}

export function useAtualizarCategoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<Omit<Categoria, "id">> }) =>
      api.atualizarCategoria(id, dados),
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
