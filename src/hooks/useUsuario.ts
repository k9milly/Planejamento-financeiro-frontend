import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useUsuario() {
  return useQuery({
    queryKey: ["usuario"],
    queryFn: api.eu,
  });
}

export function useAtualizarUsuario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (
      dados: Partial<{
        nome: string;
        alertasEmailAtivo: boolean;
        mostrarOrcamentoCategoria: boolean;
      }>,
    ) => api.atualizarEu(dados),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["usuario"] }),
  });
}
