import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

/**
 * Consulta computada, sem cache demorado — vencimento muda pouco de um
 * minuto pro outro, mas pagar um gasto fixo/fatura deve tirar o alerta da
 * lista rápido (a mutação de pagar já invalida `['resumo', ...]`; aqui
 * mantemos um staleTime curto em vez de invalidação cruzada porque `alertas`
 * não depende de ano — refetch automático ao focar a aba já resolve).
 */
export function useAlertas() {
  return useQuery({
    queryKey: ["alertas"],
    queryFn: api.alertas,
    staleTime: 30_000,
  });
}
