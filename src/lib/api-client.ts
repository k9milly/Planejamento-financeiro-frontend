/**
 * Cliente HTTP da API real (Fases 1 e 2 do PLANO-FRONTEND.md).
 *
 * Duas traduções acontecem só aqui, na borda — nenhum hook nem componente
 * lida com o formato "de fio":
 *
 * 1. **snake_case → camelCase.** Os tipos que o resto do app usa
 *    (`Lancamento`, `Conta`, `Categoria`, `GastoFixo`, `Desejo`, em
 *    `lib/finance-data.ts`) já existiam antes desta integração, criados
 *    para o mock — mantê-los é o que faz as sete telas escritas na Etapa A
 *    continuarem funcionando trocando só a origem do dado (Context mock →
 *    hook de React Query), sem reescrever cada tela.
 * 2. **Decimal-string → number.** A API manda valor monetário como string
 *    (`"1234.56"`), de propósito — evita erro de arredondamento de ponto
 *    flutuante em cálculos financeiros (ver ADR-01). Convertida para
 *    `number` aqui, na borda, é uma simplificação consciente: o app nunca
 *    re-soma uma lista grande de lançamentos crus no cliente para chegar a
 *    um total autoritativo — todo KPI/agregado usa os totais que
 *    `GET /anos/{ano}/resumo` já manda prontos do servidor (Fases 5/6). O
 *    único lugar que ainda soma no cliente é o rótulo de conveniência
 *    "Saldo filtrado" da tela de Lançamentos, sobre um subconjunto
 *    filtrado e pequeno — risco de precisão desprezível, e já era assim
 *    contra o mock.
 */

import type {
  Categoria,
  Conta,
  Desejo,
  DestinoRendimento,
  FormaPagamento,
  GastoFixo,
  Importancia,
  Lancamento,
  TipoConta,
  TipoLancamento,
} from "./finance-data";
import { sessao } from "./sessao";

const BASE = import.meta.env["VITE_API_URL"] ?? "http://localhost:8000";

/** Erro com a mensagem que o backend já manda pronta para exibir (ADR-01). */
export class ErroApi extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly campos?: { campo: string; mensagem: string }[],
  ) {
    super(message);
    this.name = "ErroApi";
  }
}

async function requisitar<T>(caminho: string, init?: RequestInit): Promise<T> {
  const token = sessao.ler();
  const resposta = await fetch(`${BASE}${caminho}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  // 401 em qualquer chamada desloga na hora — sem refresh token (ADR-03).
  // Centralizado aqui, não em cada hook: é o "interceptor" que o ADR-03 pede.
  if (resposta.status === 401 && !caminho.startsWith("/auth/login")) {
    sessao.expirou();
    throw new ErroApi("Sessão expirada. Entre novamente.", 401);
  }

  if (!resposta.ok) {
    // Depois do ADR-01, toda resposta de erro tem `{ detail, campos? }` —
    // não há mais três formatos diferentes para tratar aqui.
    let detail = `Erro ${resposta.status}`;
    let campos: { campo: string; mensagem: string }[] | undefined;
    try {
      const corpo = await resposta.json();
      if (typeof corpo.detail === "string") detail = corpo.detail;
      campos = corpo.campos;
    } catch {
      // Resposta sem corpo JSON (ex.: 204 de um endpoint que não devia ter
      // dado erro, ou falha de rede antes de chegar ao servidor).
    }
    throw new ErroApi(detail, resposta.status, campos);
  }

  return resposta.status === 204 ? (undefined as T) : resposta.json();
}

const n = (v: string) => Number(v);
const s = (v: number) => String(v);

// --------------------------------------------------------------------------- //
// Autenticação
// --------------------------------------------------------------------------- //

interface TokenOut {
  token: string;
  email: string;
}
interface UsuarioOut {
  id: number;
  email: string;
}

// --------------------------------------------------------------------------- //
// Categoria
// --------------------------------------------------------------------------- //

interface CategoriaOut {
  id: number;
  nome: string;
  cor: string;
  ativa: boolean;
}

function paraCategoria(out: CategoriaOut): Categoria {
  return { id: String(out.id), nome: out.nome, cor: out.cor, ativa: out.ativa };
}

// --------------------------------------------------------------------------- //
// Conta — metadados só; saldo/fatura vêm do resumo (ver hooks, Fase 6b)
// --------------------------------------------------------------------------- //

interface ContaOut {
  id: number;
  nome: string;
  cor: string;
  ordem: number;
  ativa: boolean;
  tipo: TipoConta;
  dia_vencimento_fatura: number | null;
  conta_pagamento_padrao_id: number | null;
}

function paraConta(out: ContaOut): Conta {
  return {
    id: String(out.id),
    nome: out.nome,
    cor: out.cor,
    tipo: out.tipo,
    ...(out.dia_vencimento_fatura != null
      ? { diaVencimentoFatura: out.dia_vencimento_fatura }
      : {}),
  };
}

// --------------------------------------------------------------------------- //
// Lançamento
// --------------------------------------------------------------------------- //

interface LancamentoOut {
  id: number;
  ano_id: number;
  mes: number;
  data: string;
  valor: string;
  tipo: TipoLancamento;
  conta_id: number;
  conta_destino_id: number | null;
  destino: DestinoRendimento | null;
  categoria_id: number | null;
  forma_pagamento: FormaPagamento | null;
  descricao: string;
  fitid: string | null;
}

function paraLancamento(out: LancamentoOut): Lancamento {
  return {
    id: String(out.id),
    data: out.data,
    descricao: out.descricao,
    valor: n(out.valor),
    tipo: out.tipo,
    contaId: String(out.conta_id),
    ...(out.categoria_id != null ? { categoriaId: String(out.categoria_id) } : {}),
    ...(out.forma_pagamento ? { formaPagamento: out.forma_pagamento } : {}),
    ...(out.conta_destino_id != null ? { contaDestinoId: String(out.conta_destino_id) } : {}),
    ...(out.destino ? { destino: out.destino } : {}),
  };
}

/** Corpo de criação/edição — o inverso de `paraLancamento`, só os campos que a API aceita. */
function paraLancamentoCriar(l: Omit<Lancamento, "id">) {
  return {
    data: l.data,
    valor: s(l.valor),
    tipo: l.tipo,
    conta_id: Number(l.contaId),
    ...(l.contaDestinoId ? { conta_destino_id: Number(l.contaDestinoId) } : {}),
    ...(l.destino ? { destino: l.destino } : {}),
    ...(l.categoriaId ? { categoria_id: Number(l.categoriaId) } : {}),
    ...(l.formaPagamento ? { forma_pagamento: l.formaPagamento } : {}),
    descricao: l.descricao,
  };
}

// --------------------------------------------------------------------------- //
// Resumo (Dashboard, Tabela Dinâmica, Mês-detalhe, saldo/fatura de Contas,
// total guardado da Wishlist — uma chamada só alimenta cinco telas)
// --------------------------------------------------------------------------- //

export interface CarteirasConta {
  contaId: string;
  nome: string;
  cor: string;
  saldo: number;
  guardado: number;
}

export interface GastoCategoria {
  categoria: string;
  total: number;
  percentual: number;
}

export interface ResumoMes {
  mes: number;
  nomeMes: string;
  entradas: number;
  saidas: number;
  guardadoNoMes: number;
  saldo: number;
  saldoInicial: number;
  guardadoAcumulado: number;
  rendimentos: number;
  perdas: number;
  transferido: number;
  porConta: CarteirasConta[];
  porCartao: CarteirasConta[];
  gastosPorCategoria: GastoCategoria[];
}

export interface ResumoAno {
  ano: number;
  arquivado: boolean;
  totalGuardado: number;
  saldoFinal: number;
  totalEntradas: number;
  totalSaidas: number;
  porConta: CarteirasConta[];
  porCartao: CarteirasConta[];
  meses: ResumoMes[];
}

interface CarteirasContaOut {
  conta_id: number;
  nome: string;
  cor: string;
  saldo: string;
  guardado: string;
}
interface GastoCategoriaOut {
  categoria: string;
  total: string;
  percentual: number;
}
interface ResumoMesOut {
  mes: number;
  nome_mes: string;
  entradas: string;
  saidas: string;
  guardado_no_mes: string;
  saldo: string;
  saldo_inicial: string;
  guardado_acumulado: string;
  rendimentos: string;
  perdas: string;
  transferido: string;
  por_conta: CarteirasContaOut[];
  por_cartao: CarteirasContaOut[];
  gastos_por_categoria: GastoCategoriaOut[];
}
interface ResumoAnoOut {
  ano: number;
  arquivado: boolean;
  total_guardado: string;
  saldo_final: string;
  total_entradas: string;
  total_saidas: string;
  por_conta: CarteirasContaOut[];
  por_cartao: CarteirasContaOut[];
  meses: ResumoMesOut[];
}

const paraCarteiras = (out: CarteirasContaOut): CarteirasConta => ({
  contaId: String(out.conta_id),
  nome: out.nome,
  cor: out.cor,
  saldo: n(out.saldo),
  guardado: n(out.guardado),
});

const paraGastoCategoria = (out: GastoCategoriaOut): GastoCategoria => ({
  categoria: out.categoria,
  total: n(out.total),
  percentual: out.percentual,
});

const paraResumoMes = (out: ResumoMesOut): ResumoMes => ({
  mes: out.mes,
  nomeMes: out.nome_mes,
  entradas: n(out.entradas),
  saidas: n(out.saidas),
  guardadoNoMes: n(out.guardado_no_mes),
  saldo: n(out.saldo),
  saldoInicial: n(out.saldo_inicial),
  guardadoAcumulado: n(out.guardado_acumulado),
  rendimentos: n(out.rendimentos),
  perdas: n(out.perdas),
  transferido: n(out.transferido),
  porConta: out.por_conta.map(paraCarteiras),
  porCartao: out.por_cartao.map(paraCarteiras),
  gastosPorCategoria: out.gastos_por_categoria.map(paraGastoCategoria),
});

const paraResumoAno = (out: ResumoAnoOut): ResumoAno => ({
  ano: out.ano,
  arquivado: out.arquivado,
  totalGuardado: n(out.total_guardado),
  saldoFinal: n(out.saldo_final),
  totalEntradas: n(out.total_entradas),
  totalSaidas: n(out.total_saidas),
  porConta: out.por_conta.map(paraCarteiras),
  porCartao: out.por_cartao.map(paraCarteiras),
  meses: out.meses.map(paraResumoMes),
});

// --------------------------------------------------------------------------- //
// Fatura de cartão
// --------------------------------------------------------------------------- //

export interface Fatura {
  cartaoId: string;
  ano: number;
  mes: number;
  valorEmAberto: number;
  situacao: "pendente" | "pago";
  lancamentoId: string | null;
  diaVencimento: number;
}

interface FaturaOut {
  cartao_id: number;
  ano: number;
  mes: number;
  valor_em_aberto: string;
  situacao: "pendente" | "pago";
  lancamento_id: number | null;
  dia_vencimento: number;
}

const paraFatura = (out: FaturaOut): Fatura => ({
  cartaoId: String(out.cartao_id),
  ano: out.ano,
  mes: out.mes,
  valorEmAberto: n(out.valor_em_aberto),
  situacao: out.situacao,
  lancamentoId: out.lancamento_id != null ? String(out.lancamento_id) : null,
  diaVencimento: out.dia_vencimento,
});

// --------------------------------------------------------------------------- //
// Gasto fixo
// --------------------------------------------------------------------------- //

interface GastoFixoMensalOut {
  mes: number;
  situacao: "pendente" | "pago";
  lancamento_id: number | null;
}
interface GastoFixoOut {
  id: number;
  ano_id: number;
  descricao: string;
  valor: string;
  dia_vencimento: number;
  forma_pagamento: FormaPagamento | null;
  categoria_id: number | null;
  conta_id: number;
  ativo: boolean;
  meses: GastoFixoMensalOut[];
}

function paraGastoFixo(out: GastoFixoOut): GastoFixo {
  const situacoes: Record<number, "pago" | "pendente"> = {};
  for (const m of out.meses) situacoes[m.mes] = m.situacao;
  return {
    id: String(out.id),
    descricao: out.descricao,
    valor: n(out.valor),
    diaVencimento: out.dia_vencimento,
    contaId: String(out.conta_id),
    ...(out.categoria_id != null ? { categoriaId: String(out.categoria_id) } : {}),
    ...(out.forma_pagamento ? { formaPagamento: out.forma_pagamento } : {}),
    ativo: out.ativo,
    situacoes,
  };
}

// --------------------------------------------------------------------------- //
// Wishlist
// --------------------------------------------------------------------------- //

interface DesejoOut {
  id: number;
  ano_id: number;
  desejo: string;
  valor: string;
  importancia: Importancia;
  somar: boolean;
  comprado: boolean;
}

function paraDesejo(out: DesejoOut): Desejo {
  return {
    id: String(out.id),
    desejo: out.desejo,
    valor: n(out.valor),
    importancia: out.importancia,
    somar: out.somar,
    comprado: out.comprado,
  };
}

export interface TotalWishlist {
  totalMarcado: number;
  totalGeral: number;
  quantidadeMarcada: number;
}

// --------------------------------------------------------------------------- //
// A API
// --------------------------------------------------------------------------- //

export const api = {
  // Autenticação
  login: async (email: string, senha: string) => {
    const dados = await requisitar<TokenOut>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });
    sessao.guardar(dados.token);
    return dados;
  },
  eu: () => requisitar<UsuarioOut>("/auth/eu"),
  sair: () => sessao.limpar(),

  // Resumo
  resumo: (ano: number) => requisitar<ResumoAnoOut>(`/anos/${ano}/resumo`).then(paraResumoAno),

  // Categorias
  listarCategorias: () =>
    requisitar<CategoriaOut[]>("/categorias").then((l) => l.map(paraCategoria)),
  criarCategoria: (nome: string, cor?: string) =>
    requisitar<CategoriaOut>("/categorias", {
      method: "POST",
      body: JSON.stringify({ nome, ...(cor ? { cor } : {}) }),
    }).then(paraCategoria),
  atualizarCategoria: (id: string, dados: Partial<{ nome: string; cor: string; ativa: boolean }>) =>
    requisitar<CategoriaOut>(`/categorias/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dados),
    }).then(paraCategoria),
  excluirCategoria: (id: string) => requisitar<void>(`/categorias/${id}`, { method: "DELETE" }),

  // Contas
  listarContas: (tipo?: TipoConta) =>
    requisitar<ContaOut[]>(`/contas${tipo ? `?tipo=${tipo}` : ""}`).then((l) => l.map(paraConta)),
  criarConta: (dados: {
    nome: string;
    cor?: string;
    tipo?: TipoConta;
    diaVencimentoFatura?: number | null;
  }) =>
    requisitar<ContaOut>("/contas", {
      method: "POST",
      body: JSON.stringify({
        nome: dados.nome,
        ...(dados.cor ? { cor: dados.cor } : {}),
        ...(dados.tipo ? { tipo: dados.tipo } : {}),
        ...(dados.diaVencimentoFatura !== undefined
          ? { dia_vencimento_fatura: dados.diaVencimentoFatura }
          : {}),
      }),
    }).then(paraConta),
  atualizarConta: (
    id: string,
    dados: Partial<{
      nome: string;
      cor: string;
      tipo: TipoConta;
      diaVencimentoFatura: number | null;
    }>,
  ) =>
    requisitar<ContaOut>(`/contas/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(dados.nome !== undefined ? { nome: dados.nome } : {}),
        ...(dados.cor !== undefined ? { cor: dados.cor } : {}),
        ...(dados.tipo !== undefined ? { tipo: dados.tipo } : {}),
        ...(dados.diaVencimentoFatura !== undefined
          ? { dia_vencimento_fatura: dados.diaVencimentoFatura }
          : {}),
      }),
    }).then(paraConta),
  excluirConta: (id: string) => requisitar<void>(`/contas/${id}`, { method: "DELETE" }),

  // Lançamentos
  listarLancamentos: (
    ano: number,
    filtros?: { mes?: number; tipo?: TipoLancamento; categoriaId?: string; contaId?: string },
  ) => {
    const params = new URLSearchParams();
    if (filtros?.mes) params.set("mes", String(filtros.mes));
    if (filtros?.tipo) params.set("tipo", filtros.tipo);
    if (filtros?.categoriaId) params.set("categoria_id", filtros.categoriaId);
    if (filtros?.contaId) params.set("conta_id", filtros.contaId);
    const query = params.toString();
    return requisitar<LancamentoOut[]>(`/anos/${ano}/lancamentos${query ? `?${query}` : ""}`).then(
      (l) => l.map(paraLancamento),
    );
  },
  criarLancamento: (ano: number, dados: Omit<Lancamento, "id">) =>
    requisitar<LancamentoOut>(`/anos/${ano}/lancamentos`, {
      method: "POST",
      body: JSON.stringify(paraLancamentoCriar(dados)),
    }).then(paraLancamento),
  atualizarLancamento: (ano: number, id: string, dados: Omit<Lancamento, "id">) =>
    requisitar<LancamentoOut>(`/anos/${ano}/lancamentos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(paraLancamentoCriar(dados)),
    }).then(paraLancamento),
  excluirLancamento: (ano: number, id: string) =>
    requisitar<void>(`/anos/${ano}/lancamentos/${id}`, { method: "DELETE" }),

  // Gastos fixos
  listarGastosFixos: (ano: number) =>
    requisitar<GastoFixoOut[]>(`/anos/${ano}/gastos-fixos`).then((l) => l.map(paraGastoFixo)),
  criarGastoFixo: (
    ano: number,
    dados: {
      descricao: string;
      valor: number;
      diaVencimento: number;
      contaId: string;
      categoriaId?: string;
      formaPagamento?: FormaPagamento;
    },
  ) =>
    requisitar<GastoFixoOut>(`/anos/${ano}/gastos-fixos`, {
      method: "POST",
      body: JSON.stringify({
        descricao: dados.descricao,
        valor: s(dados.valor),
        dia_vencimento: dados.diaVencimento,
        conta_id: Number(dados.contaId),
        ...(dados.categoriaId ? { categoria_id: Number(dados.categoriaId) } : {}),
        ...(dados.formaPagamento ? { forma_pagamento: dados.formaPagamento } : {}),
      }),
    }).then(paraGastoFixo),
  atualizarGastoFixo: (
    ano: number,
    id: string,
    dados: Partial<{
      descricao: string;
      valor: number;
      diaVencimento: number;
      contaId: string;
      categoriaId: string;
      formaPagamento: FormaPagamento;
      ativo: boolean;
    }>,
  ) =>
    requisitar<GastoFixoOut>(`/anos/${ano}/gastos-fixos/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(dados.descricao !== undefined ? { descricao: dados.descricao } : {}),
        ...(dados.valor !== undefined ? { valor: s(dados.valor) } : {}),
        ...(dados.diaVencimento !== undefined ? { dia_vencimento: dados.diaVencimento } : {}),
        ...(dados.contaId !== undefined ? { conta_id: Number(dados.contaId) } : {}),
        ...(dados.categoriaId !== undefined ? { categoria_id: Number(dados.categoriaId) } : {}),
        ...(dados.formaPagamento !== undefined ? { forma_pagamento: dados.formaPagamento } : {}),
        ...(dados.ativo !== undefined ? { ativo: dados.ativo } : {}),
      }),
    }).then(paraGastoFixo),
  excluirGastoFixo: (ano: number, id: string) =>
    requisitar<void>(`/anos/${ano}/gastos-fixos/${id}`, { method: "DELETE" }),
  pagarGastoFixo: (ano: number, id: string, mes: number) =>
    requisitar<LancamentoOut>(`/anos/${ano}/gastos-fixos/${id}/meses/${mes}/pagar`, {
      method: "POST",
    }).then(paraLancamento),
  desfazerGastoFixo: (ano: number, id: string, mes: number) =>
    requisitar<void>(`/anos/${ano}/gastos-fixos/${id}/meses/${mes}/desfazer`, { method: "POST" }),

  // Fatura de cartão
  fatura: (ano: number, cartaoId: string, mes: number) =>
    requisitar<FaturaOut>(`/anos/${ano}/cartoes/${cartaoId}/fatura?mes=${mes}`).then(paraFatura),
  pagarFatura: (ano: number, cartaoId: string, mes: number, contaPagamentoId?: string) =>
    requisitar<LancamentoOut>(`/anos/${ano}/cartoes/${cartaoId}/fatura/${mes}/pagar`, {
      method: "POST",
      ...(contaPagamentoId
        ? { body: JSON.stringify({ conta_pagamento_id: Number(contaPagamentoId) }) }
        : {}),
    }).then(paraLancamento),
  desfazerFatura: (ano: number, cartaoId: string, mes: number) =>
    requisitar<void>(`/anos/${ano}/cartoes/${cartaoId}/fatura/${mes}/desfazer`, { method: "POST" }),

  // Wishlist
  listarWishlist: (ano: number) =>
    requisitar<DesejoOut[]>(`/anos/${ano}/wishlist`).then((l) => l.map(paraDesejo)),
  totalWishlist: (ano: number) =>
    requisitar<{ total_marcado: string; total_geral: string; quantidade_marcada: number }>(
      `/anos/${ano}/wishlist/total`,
    ).then((out) => ({
      totalMarcado: n(out.total_marcado),
      totalGeral: n(out.total_geral),
      quantidadeMarcada: out.quantidade_marcada,
    })),
  criarDesejo: (ano: number, dados: Omit<Desejo, "id" | "comprado">) =>
    requisitar<DesejoOut>(`/anos/${ano}/wishlist`, {
      method: "POST",
      body: JSON.stringify({
        desejo: dados.desejo,
        valor: s(dados.valor),
        importancia: dados.importancia,
        somar: dados.somar,
      }),
    }).then(paraDesejo),
  atualizarDesejo: (ano: number, id: string, dados: Partial<Omit<Desejo, "id">>) =>
    requisitar<DesejoOut>(`/anos/${ano}/wishlist/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        ...(dados.desejo !== undefined ? { desejo: dados.desejo } : {}),
        ...(dados.valor !== undefined ? { valor: s(dados.valor) } : {}),
        ...(dados.importancia !== undefined ? { importancia: dados.importancia } : {}),
        ...(dados.somar !== undefined ? { somar: dados.somar } : {}),
        ...(dados.comprado !== undefined ? { comprado: dados.comprado } : {}),
      }),
    }).then(paraDesejo),
  excluirDesejo: (ano: number, id: string) =>
    requisitar<void>(`/anos/${ano}/wishlist/${id}`, { method: "DELETE" }),
};
