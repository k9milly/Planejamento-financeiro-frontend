/**
 * Sessão: o token JWT guardado no navegador (ADR-03).
 *
 * `localStorage`, não cookie — o backend não emite `Set-Cookie` (é Bearer
 * puro), e é consistente com o resto do app, que já guarda preferências
 * (tema, modo de período) do mesmo jeito.
 */

const CHAVE = "planejamento:token";

/** Chamado por quem escuta um 401 (ver `api-client.ts`) para avisar a UI. */
type Ouvinte = () => void;
const ouvintesExpiracao = new Set<Ouvinte>();

export const sessao = {
  ler: (): string | null => localStorage.getItem(CHAVE),

  guardar: (token: string) => localStorage.setItem(CHAVE, token),

  limpar: () => localStorage.removeItem(CHAVE),

  /** Um 401 em qualquer chamada desloga na hora — sem refresh token (ADR-03). */
  expirou: () => {
    localStorage.removeItem(CHAVE);
    ouvintesExpiracao.forEach((f) => f());
  },

  /** A rota de login usa isto para saber quando redirecionar de volta. */
  observarExpiracao: (ouvinte: Ouvinte) => {
    ouvintesExpiracao.add(ouvinte);
    return () => ouvintesExpiracao.delete(ouvinte);
  },
};
