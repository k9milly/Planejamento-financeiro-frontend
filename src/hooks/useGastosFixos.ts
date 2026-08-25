import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { FormaPagamento } from "@/lib/finance-data";

export function useGastosFixos(ano: number) {
  return useQuery({
    queryKey: ["gastos-fixos", ano],
    queryFn: () => api.listarGastosFixos(ano),
  });
}

function invalidarTudo(qc: ReturnType<typeof useQueryClient>, ano: number) {
  qc.invalidateQueries({ queryKey: ["gastos-fixos", ano] });
  qc.invalidateQueries({ queryKey: ["resumo", ano] });
}

export function useCriarGastoFixo(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: {
      descricao: string;
      valor: number;
      diaVencimento: number;
      contaId: string;
      categoriaId?: string;
      formaPagamento?: FormaPagamento;
    }) => api.criarGastoFixo(ano, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gastos-fixos", ano] }),
  });
}

export function useAtualizarGastoFixo(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      dados,
    }: {
      id: string;
      dados: Partial<{
        descricao: string;
        valor: number;
        diaVencimento: number;
        contaId: string;
        categoriaId: string;
        formaPagamento: FormaPagamento;
        ativo: boolean;
      }>;
    }) => api.atualizarGastoFixo(ano, id, dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gastos-fixos", ano] }),
  });
}

export function useExcluirGastoFixo(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.excluirGastoFixo(ano, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gastos-fixos", ano] }),
  });
}

/** Não é um PATCH de campo — cria um lançamento de verdade (ver spec, seção 9). */
export function usePagarGastoFixo(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mes }: { id: string; mes: number }) => api.pagarGastoFixo(ano, id, mes),
    onSuccess: () => invalidarTudo(qc, ano),
  });
}

export function useDesfazerGastoFixo(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mes }: { id: string; mes: number }) => api.desfazerGastoFixo(ano, id, mes),
    onSuccess: () => invalidarTudo(qc, ano),
  });
}
