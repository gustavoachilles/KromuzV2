/**
 * Facta Financeira API Client
 * Documentação: https://webservice.facta.com.br/documentacao
 *
 * Endpoints INSS:
 *   GET  /gera-token
 *   GET  /proposta/operacoes-disponiveis
 *   POST /proposta/etapa1-simulador
 *   POST /proposta/etapa2-dados-pessoais
 *   POST /proposta/etapa3-proposta-cadastro
 *   POST /proposta/envio-link
 *
 * Endpoints FGTS:
 *   GET  /fgts/saldo?cpf=XXX
 *   POST /fgts/calculo
 *   POST /proposta/etapa1-simulador  (vinculação)
 */

// ── Config ──────────────────────────────────────────────
const FACTA_BASIC = process.env.FACTA_API_BASIC ?? "";
const FACTA_URL_PROD = process.env.FACTA_API_URL ?? "https://webservice.facta.com.br";
const FACTA_URL_HOMOL = process.env.FACTA_API_URL_HOMOL ?? "https://webservice-homol.facta.com.br";

// Usar homologação por padrão até Cloudflare liberar IP de produção
const USE_HOMOL = process.env.FACTA_USE_HOMOL !== "false";
const BASE_URL = USE_HOMOL ? FACTA_URL_HOMOL : FACTA_URL_PROD;

// ── Token Cache ─────────────────────────────────────────
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function getFactaToken(): Promise<string> {
  // Retorna token em cache se ainda válido (margem de 5min)
  if (cachedToken && Date.now() < tokenExpiry - 5 * 60 * 1000) {
    return cachedToken;
  }

  const res = await fetch(`${BASE_URL}/gera-token`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${FACTA_BASIC}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Facta token error: HTTP ${res.status}`);
  }

  const data = await res.json();

  if (data.erro) {
    throw new Error(`Facta token error: ${data.mensagem}`);
  }

  cachedToken = data.token;
  // Token válido por 1h, cachear por 55min
  tokenExpiry = Date.now() + 55 * 60 * 1000;

  return cachedToken!;
}

// ── Helpers ─────────────────────────────────────────────
async function factaGet(path: string, params?: Record<string, string>) {
  const token = await getFactaToken();
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  return res.json();
}

async function factaPost(path: string, body: Record<string, string>) {
  const token = await getFactaToken();
  const formData = new URLSearchParams();
  Object.entries(body).forEach(([k, v]) => formData.append(k, v));

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    body: formData,
  });

  return res.json();
}

async function factaPostJSON(path: string, body: object) {
  const token = await getFactaToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return res.json();
}

// ── INSS ────────────────────────────────────────────────

/**
 * Consulta operações INSS disponíveis (tabelas, taxas, coeficientes)
 * tipo_operacao: 13 = NOVO DIGITAL, 27 = MARGEM COMPLEMENTAR DIGITAL
 */
export async function inssOperacoesDisponiveis(params: {
  cpf: string;
  dataNascimento: string; // DD/MM/AAAA
  valor?: number;
  valorParcela?: number;
  prazo?: number;
  tipoOperacao?: number; // 13 ou 27
}) {
  return factaGet("/proposta/operacoes-disponiveis", {
    produto: "D",
    tipo_operacao: String(params.tipoOperacao ?? 13),
    averbador: "3",
    convenio: "3",
    opcao_valor: params.valorParcela ? "2" : "1",
    valor: String(params.valor ?? 1000),
    valor_parcela: String(params.valorParcela ?? ""),
    prazo: String(params.prazo ?? 84),
    cpf: params.cpf.replace(/\D/g, ""),
    data_nascimento: params.dataNascimento,
  });
}

/**
 * Simula valores de operação INSS (Etapa 1)
 * Retorna id_simulador para uso na etapa 2
 */
export async function inssSimulacao(params: {
  cpf: string;
  dataNascimento: string;
  codigoTabela: number;
  prazo: number;
  valorOperacao: number;
  valorParcela: number;
  coeficiente: string;
  loginCertificado?: string;
  vendedor?: string;
  gerenteComercial?: string;
}) {
  return factaPost("/proposta/etapa1-simulador", {
    produto: "D",
    tipo_operacao: "13",
    averbador: "3",
    convenio: "3",
    cpf: params.cpf.replace(/\D/g, ""),
    data_nascimento: params.dataNascimento,
    login_certificado: params.loginCertificado ?? process.env.FACTA_API_USER ?? "",
    codigo_tabela: String(params.codigoTabela),
    prazo: String(params.prazo),
    valor_operacao: String(params.valorOperacao),
    valor_parcela: String(params.valorParcela),
    coeficiente: params.coeficiente,
    ...(params.vendedor ? { vendedor: params.vendedor } : {}),
    ...(params.gerenteComercial ? { gerente_comercial: params.gerenteComercial } : {}),
  });
}

// ── FGTS ────────────────────────────────────────────────

/**
 * Consulta saldo FGTS disponível para antecipação de saque aniversário
 * ATENÇÃO: Só funciona em PRODUÇÃO (não em homologação)
 */
export async function fgtsSaldo(cpf: string) {
  return factaGet("/fgts/saldo", {
    cpf: cpf.replace(/\D/g, ""),
  });
}

/**
 * Calcula valor líquido FGTS para antecipação
 * Recebe parcelas com datas de repasse e valores
 */
export async function fgtsCalculo(params: {
  cpf: string;
  taxa?: string;
  tabela?: string;
  parcelas?: Array<{ dataRepasse: string; valor: string }>;
  jsonSaldo?: string; // Resultado direto do fgts/saldo
}) {
  // Se tiver jsonSaldo, usa form-data
  if (params.jsonSaldo) {
    return factaPost("/fgts/calculo", {
      cpf: params.cpf.replace(/\D/g, ""),
      ...(params.taxa ? { taxa: params.taxa } : {}),
      ...(params.tabela ? { tabela: params.tabela } : {}),
      json_saldo: params.jsonSaldo,
    });
  }

  // Senão, usa JSON com array de parcelas
  const parcelasObj: Record<string, string>[] = (params.parcelas ?? []).map(
    (p, i) => ({
      [`dataRepasse_${i + 1}`]: p.dataRepasse,
      [`valor_${i + 1}`]: p.valor,
    })
  );

  return factaPostJSON("/fgts/calculo", {
    cpf: params.cpf.replace(/\D/g, ""),
    taxa: params.taxa ?? "",
    tabela: params.tabela ?? "",
    parcelas: parcelasObj,
  });
}

// ── Tipos Exportados ────────────────────────────────────

export type FactaTabelaINSS = {
  tabela: string;
  codigoTabela: number;
  convenio: string;
  idConvenio: number;
  tipoOperacao: string;
  idTipoOperacao: number;
  averbador: string;
  idAverbador: number;
  taxa: number;
  prazo: number;
  coeficiente: number;
  contrato: number;
  parcela: number;
  valor_seguro: number;
  valor_liquido: number;
  saldo_devedor: number;
};

export type FactaFgtsSaldo = {
  erro: boolean;
  tipo: string;
  msg: string;
  retorno: {
    data_saldo: string;
    horaSaldo: string;
    saldo_total: string;
    [key: string]: string; // dataRepasse_X, valor_X
  };
};

export type FactaFgtsCalculo = {
  permitido: string;
  simulacao_fgts: string;
  valor_liquido: number;
  iof: number;
  taxa: string;
  parcelas_selecionadas: number;
  tabela: string;
  data_solicitacao: string;
};

export const FACTA_FGTS_TABELAS = [
  { codigo: 50407, nome: "LIGHT 400", taxa: 1.80 },
  { codigo: 48291, nome: "LIGHT", taxa: 1.80 },
  { codigo: 53201, nome: "PLUS", taxa: 1.80 },
  { codigo: 53210, nome: "PLUS", taxa: 1.80 },
  { codigo: 53228, nome: "TOP", taxa: 1.80 },
  { codigo: 53236, nome: "GOLD RN", taxa: 1.80 },
  { codigo: 53244, nome: "SMART LIGHT", taxa: 1.80 },
  { codigo: 53252, nome: "SMART FLEX", taxa: 1.80 },
  { codigo: 53260, nome: "SMART VIP", taxa: 1.80 },
  { codigo: 53279, nome: "SMART TURBO", taxa: 1.80 },
  { codigo: 53287, nome: "GOLD", taxa: 1.80 },
] as const;

export const FACTA_CONFIG = {
  baseUrl: BASE_URL,
  isHomol: USE_HOMOL,
  prodUrl: FACTA_URL_PROD,
  homolUrl: FACTA_URL_HOMOL,
} as const;
