import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Desejo } from "@/lib/finance-data";

export function useWishlist(ano: number) {
  return useQuery({
    queryKey: ["wishlist", ano],
    queryFn: () => api.listarWishlist(ano),
  });
}

export function useWishlistTotal(ano: number) {
  return useQuery({
    queryKey: ["wishlist-total", ano],
    queryFn: () => api.totalWishlist(ano),
  });
}

/** Qualquer mudança num item afeta o total — invalida as duas chaves juntas. */
function invalidarTudo(qc: ReturnType<typeof useQueryClient>, ano: number) {
  qc.invalidateQueries({ queryKey: ["wishlist", ano] });
  qc.invalidateQueries({ queryKey: ["wishlist-total", ano] });
}

export function useCriarDesejo(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: Omit<Desejo, "id" | "comprado">) => api.criarDesejo(ano, dados),
    onSuccess: () => invalidarTudo(qc, ano),
  });
}

export function useAtualizarDesejo(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dados }: { id: string; dados: Partial<Omit<Desejo, "id">> }) =>
      api.atualizarDesejo(ano, id, dados),
    onSuccess: () => invalidarTudo(qc, ano),
  });
}

export function useExcluirDesejo(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.excluirDesejo(ano, id),
    onSuccess: () => invalidarTudo(qc, ano),
  });
}
