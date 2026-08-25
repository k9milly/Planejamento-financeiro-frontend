import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

/**
 * Uma chamada só alimenta Dashboard, Tabela Dinâmica, Mês-detalhe, o
 * saldo/fatura de cada conta em Contas, e o "total guardado" da Wishlist
 * (ver especificação-técnica-funcional.md, seção 1). `staleTime` generoso
 * (ADR-02): só o próprio usuário muda este dado, e só pelo próprio app.
 */
export function useResumo(ano: number) {
  return useQuery({
    queryKey: ["resumo", ano],
    queryFn: () => api.resumo(ano),
    staleTime: 60_000,
  });
}
