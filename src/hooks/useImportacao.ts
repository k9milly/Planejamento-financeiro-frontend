import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type FormatoImportacao, type TransacaoParaConfirmar } from "@/lib/api-client";

/** Só lê e classifica — nada é gravado (ADR-08). Não é `useQuery`: é disparada
 * sob demanda ao enviar o arquivo, não por uma chave que faça sentido cachear. */
export function usePreviaImportacao() {
  return useMutation({
    mutationFn: ({
      ano,
      arquivo,
      formato,
    }: {
      ano: number;
      arquivo: File;
      formato: FormatoImportacao;
    }) => api.previaImportacao(ano, arquivo, formato),
  });
}

export function useConfirmarImportacao(ano: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (transacoes: TransacaoParaConfirmar[]) => api.confirmarImportacao(ano, transacoes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lancamentos", ano] });
      qc.invalidateQueries({ queryKey: ["resumo", ano] });
      qc.invalidateQueries({ queryKey: ["alertas"] });
    },
  });
}
