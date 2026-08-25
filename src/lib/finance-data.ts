/**
 * Tipos e utilitários do domínio financeiro.
 *
 * Nomenclatura em português (valor, tipo, contaId, categoriaId,
 * formaPagamento, diaVencimento...) de propósito: é o mesmo vocabulário do
 * contrato da API real (ver docs/CONTRATO-API.md do backend) — a tradução
 * snake_case ↔ camelCase e Decimal-string ↔ number fica isolada em
 * src/lib/api-client.ts.
 */

export type TipoLancamento =
  "entrada" | "saida" | "guardado" | "retirado" | "rendimento" | "perda" | "transferencia";

export type FormaPagamento = "credito" | "debito" | "pix" | "dinheiro";

/** Só relevante para `tipo` "rendimento"/"perda": onde o ganho/perda é aplicado. */
export type DestinoRendimento = "conta" | "guardado";

export type TipoConta = "corrente" | "cartao_credito";

export type Importancia = "alta" | "media" | "baixa";

export interface Categoria {
  id: string;
  nome: string;
  cor: string;
  ativa: boolean;
}

export interface Conta {
  id: string;
  nome: string;
  cor: string;
  tipo: TipoConta;
  /** 1–31; só quando tipo === "cartao_credito". */
  diaVencimentoFatura?: number;
  /**
   * `GET /contas` não devolve saldo — o número real vem de
   * `GET /anos/{ano}/resumo` (`por_conta`/`por_cartao`), casado por `id`.
   * Ausente numa `Conta` "crua" (recém-listada); presente depois do join
   * feito em `ContasSection`/Dashboard.
   */
  saldo?: number;
  /** Idem, só quando tipo === "cartao_credito" — a fatura em aberto. */
  faturaEmAberto?: number;
}

export interface Lancamento {
  id: string;
  data: string; // ISO yyyy-mm-dd
  descricao: string;
  valor: number;
  tipo: TipoLancamento;
  contaId: string;
  /** Só quando tipo === "saida". */
  categoriaId?: string;
  /** Só quando tipo === "saida". */
  formaPagamento?: FormaPagamento;
  /** Só quando tipo === "transferencia". */
  contaDestinoId?: string;
  /** Só quando tipo === "rendimento" ou "perda". */
  destino?: DestinoRendimento;
}

export interface GastoFixo {
  id: string;
  descricao: string;
  valor: number;
  diaVencimento: number;
  contaId: string;
  categoriaId?: string;
  formaPagamento?: FormaPagamento;
  ativo: boolean;
  /** Situação por mês (1–12) do ano corrente — chave ausente = pendente. */
  situacoes: Record<number, "pago" | "pendente">;
}

export interface Desejo {
  id: string;
  desejo: string;
  valor: number;
  importancia: Importancia;
  somar: boolean;
  comprado: boolean;
}

export const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

export const YEAR = 2026;

export const ROTULO_TIPO_LANCAMENTO: Record<TipoLancamento, string> = {
  entrada: "Entrada",
  saida: "Saída",
  guardado: "Guardado",
  retirado: "Retirado",
  rendimento: "Rendimento",
  perda: "Perda",
  transferencia: "Transferência",
};

export const ROTULO_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  credito: "Crédito",
  debito: "Débito",
  pix: "Pix",
  dinheiro: "Dinheiro",
};

// ---------------------------------------------------------------------------
// Metas & Orçamentos — o backend não tem endpoint para orçamentos/metas de
// poupança (ver ADR 0007 do backend), então a tela de Metas continua usando
// estes dados de exemplo; o gasto realizado por categoria, porém, já vem do
// resumo real (ver src/routes/metas.tsx).
// ---------------------------------------------------------------------------

export const budgets = [
  { category: "Moradia", limit: 2600 },
  { category: "Alimentação", limit: 1200 },
  { category: "Transporte", limit: 600 },
  { category: "Lazer", limit: 700 },
  { category: "Saúde", limit: 600 },
  { category: "Assinaturas", limit: 200 },
];

export const goals = [
  { name: "Reserva de emergência", target: 30000, saved: 18400 },
  { name: "Viagem Patagônia", target: 12000, saved: 4300 },
  { name: "Notebook novo", target: 9000, saved: 6750 },
];
