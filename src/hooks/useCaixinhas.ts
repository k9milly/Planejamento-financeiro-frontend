import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useCaixinhas(contaId: string | undefined, incluirInativas = false) {
  return useQuery({
    queryKey: ["caixinhas", contaId, incluirInativas],
    queryFn: () => api.listarCaixinhas(contaId!, incluirInativas),
    enabled: !!contaId,
  });
}

/**
 * Qualquer mudança em caixinha pode afetar: o total "guardado" da conta (via
 * `resumo`), a lista de lançamentos (transferência cria um; guardado/retirado
 * vinculado também), e o progresso de uma meta vinculada (ADR-06 + ADR-10).
 * Sem saber o ano certo aqui (a rota de caixinha não é por ano), invalida os
 * prefixos inteiros — React Query casa qualquer sufixo.
 */
function invalidarTudo(qc: ReturnType<typeof useQueryClient>, contaId: string) {
  qc.invalidateQueries({ queryKey: ["caixinhas", contaId] });
  qc.invalidateQueries({ queryKey: ["resumo"] });
  qc.invalidateQueries({ queryKey: ["lancamentos"] });
  qc.invalidateQueries({ queryKey: ["metas-poupanca"] });
}

export function useCriarCaixinha(contaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { nome: string; metaId?: string; saldoInicial?: number }) =>
      api.criarCaixinha(contaId, dados),
    onSuccess: () => invalidarTudo(qc, contaId),
  });
}

export function useAtualizarCaixinha(contaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      dados,
    }: {
      id: string;
      dados: Partial<{ nome: string; metaId: string | null }>;
    }) => api.atualizarCaixinha(contaId, id, dados),
    onSuccess: () => invalidarTudo(qc, contaId),
  });
}

export function useExcluirCaixinha(contaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.excluirCaixinha(contaId, id),
    onSuccess: () => invalidarTudo(qc, contaId),
  });
}

export function useTransferirCaixinha(contaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dados: { caixinhaOrigemId: string; caixinhaDestinoId: string; valor: number }) =>
      api.transferirCaixinha(contaId, dados),
    onSuccess: () => invalidarTudo(qc, contaId),
  });
}
