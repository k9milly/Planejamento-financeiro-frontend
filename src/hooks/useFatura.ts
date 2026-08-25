import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useFatura(ano: number, cartaoId: string | undefined, mes: number) {
  return useQuery({
    queryKey: ["fatura", ano, cartaoId, mes],
    queryFn: () => api.fatura(ano, cartaoId!, mes),
    enabled: !!cartaoId,
  });
}

function invalidarTudo(qc: ReturnType<typeof useQueryClient>, ano: number, cartaoId: string) {
  qc.invalidateQueries({ queryKey: ["fatura", ano, cartaoId] });
  qc.invalidateQueries({ queryKey: ["resumo", ano] });
}

export function usePagarFatura(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      cartaoId,
      mes,
      contaPagamentoId,
    }: {
      cartaoId: string;
      mes: number;
      contaPagamentoId?: string;
    }) => api.pagarFatura(ano, cartaoId, mes, contaPagamentoId),
    onSuccess: (_dados, variaveis) => invalidarTudo(qc, ano, variaveis.cartaoId),
  });
}

export function useDesfazerFatura(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cartaoId, mes }: { cartaoId: string; mes: number }) =>
      api.desfazerFatura(ano, cartaoId, mes),
    onSuccess: (_dados, variaveis) => invalidarTudo(qc, ano, variaveis.cartaoId),
  });
}
