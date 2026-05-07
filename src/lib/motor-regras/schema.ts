// Schema do Motor de Regras — abordagem "input livre, output canônico".
//
// Filosofia: a IA pode retornar qualquer coisa. Em vez de coagir o LLM ao
// nosso schema, fazemos:
//   1. Schema de INPUT permissivo (passthrough) — aceita qualquer JSON
//   2. Normalizador TS em extrair.ts produz o tipo `RegraExtraida` canônico
//   3. UI consome SEMPRE o tipo canônico — nunca vê null vs undefined etc.
//
// Tipos canônicos:
//   - Strings: sempre string (default "")
//   - Arrays: sempre array (default [])
//   - Numbers nullable: sempre `number | null` (nunca undefined)
//   - Booleans nullable: sempre `boolean | null` (tri-state — null = desconhecido)

import { z } from "zod";

export const TIPOS_OPERACAO = [
  "EMPRESTIMO_CONSIGNADO",
  "REFINANCIAMENTO",
  "PORTABILIDADE",
  "PORTABILIDADE_REFIN",
  "CARTAO_CONSIGNADO",
  "CARTAO_BENEFICIO",
] as const;

export type TipoOperacao = (typeof TIPOS_OPERACAO)[number];

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMA DE INPUT — extremamente permissivo
// Aceita qualquer JSON, valida apenas a estrutura mínima.
// ─────────────────────────────────────────────────────────────────────────────

export const RawRespostaSchema = z.looseObject({
  banco_nome: z.unknown().optional(),
  versao_roteiro: z.unknown().optional(),
  regras: z.array(z.unknown()).optional().default([]),
});

export type RawResposta = z.infer<typeof RawRespostaSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS DE OUTPUT — produzidos pelo normalizador, consumidos pela UI
// ─────────────────────────────────────────────────────────────────────────────

export type FaixaEtaria = {
  idade_min: number | null;
  idade_max: number | null;
  prazo_max: number | null;
  valor_max: number | null;
  observacao: string | null;
};

export type BancoPagamento = {
  codigo: string;
  nome: string;
};

export type RestricaoEspecie = {
  especies: number[];
  descricao: string;
  idade_minima: number | null;
  excecao: string | null;
};

export type RegraExtraida = {
  tipo_operacao: TipoOperacao;
  produto_nome_sugerido: string;
  convenio_nome: string;
  faixas_etarias: FaixaEtaria[];
  especies_aceitas: string[];
  especies_bloqueadas: string[];

  margem_padrao_pct: number | null;
  margem_loas_pct: number | null;

  valor_min: number | null;
  valor_max: number | null;

  parcelas_min_pagas: number | null;

  // tri-state: true / false / null (desconhecido)
  agrega_margem: boolean | null;
  permite_margem_negativa: boolean | null;
  permite_reduzir_parcela: boolean | null;

  max_contratos_unica_digitacao: number | null;
  taxa_minima_am: number | null;
  taxa_maxima_am: number | null;
  max_contratos_por_beneficio: number | null;
  data_corte: string;

  limite_cartao_minimo: number | null;
  limite_cartao_maximo: number | null;
  fator_rmc: number | null;
  parcela_minima: number | null;
  saldo_devedor_maximo: number | null;
  troco_minimo_liberado: number | null;

  versao_roteiro: string | null;
  data_atualizacao_roteiro: string | null;
  validade_roteiro: string | null;

  bancos_pagamento: BancoPagamento[];
  documentos_obrigatorios: string[];
  publico_excluido: string[];
  restricoes_por_especie: RestricaoEspecie[];

  // Novos campos do mercado Consignado
  representante_legal_permitido: boolean | null;
  idade_max_representante: number | null;
  analfabeto_permitido: boolean | null;
  uf_bloqueadas: string[];
  ddb_minimo_dias: number | null;

  observacoes: string;
};

export type RespostaLLM = {
  banco_nome: string;
  versao_roteiro: string;
  regras: RegraExtraida[];
};
