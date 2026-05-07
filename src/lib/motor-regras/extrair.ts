// Pipeline de extração de regras de PDF/Imagem.
//
// Filosofia:
//   1. Pedimos JSON ao LLM (Gemini multimodal ou Claude com vision/PDF)
//   2. Aceitamos QUALQUER coisa que ele retornar — schema permissivo
//   3. Um normalizador imperativo TS produz o tipo `RegraExtraida` canônico
//
// Vantagens:
//   - Não importa se a IA retornou null em vez de undefined em booleans
//   - Não importa se omitiu campos
//   - Não importa se retornou -1, "", string em vez de número
//   - O normalizador aplica defaults seguros e a UI sempre vê dados limpos.

import { GoogleGenAI } from "@google/genai";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  RawRespostaSchema,
  type RegraExtraida,
  type FaixaEtaria,
  type BancoPagamento,
  type RestricaoEspecie,
  type RespostaLLM,
  TIPOS_OPERACAO,
  type TipoOperacao,
} from "./schema";
import { buildPromptExtracao } from "./prompt";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE COERÇÃO — convertem `unknown` em tipos canônicos com defaults seguros
// ─────────────────────────────────────────────────────────────────────────────

function toStr(v: unknown, fallback = ""): string {
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return fallback;
}

function toNullableStr(v: unknown): string | null {
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed || trimmed.toLowerCase() === "null") return null;
    return trimmed;
  }
  return null;
}

function toNullableNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v !== -1) return v;
  if (typeof v === "string") {
    const cleaned = v.trim().replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    if (Number.isFinite(n) && n !== -1 && cleaned !== "") return n;
  }
  return null;
}

function toNullableBool(v: unknown): boolean | null {
  if (v === true || v === false) return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "sim" || s === "permite" || s === "yes") return true;
    if (s === "false" || s === "nao" || s === "não" || s === "não permite" || s === "no")
      return false;
  }
  return null;
}

function toStrArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x : typeof x === "number" ? String(x) : null))
    .filter((x): x is string => x !== null && x !== "");
}

function toNumArr(v: unknown): number[] {
  if (!Array.isArray(v)) return [];
  return v.map(toNullableNum).filter((x): x is number => x !== null);
}

function toFaixa(v: unknown): FaixaEtaria | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  return {
    idade_min: toNullableNum(r.idade_min),
    idade_max: toNullableNum(r.idade_max),
    prazo_max: toNullableNum(r.prazo_max),
    valor_max: toNullableNum(r.valor_max),
    observacao: toNullableStr(r.observacao),
  };
}

function toBancoPagamento(v: unknown): BancoPagamento | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  const codigo = toStr(r.codigo);
  const nome = toStr(r.nome);
  if (!codigo && !nome) return null;
  return { codigo, nome };
}

function toRestricaoEspecie(v: unknown): RestricaoEspecie | null {
  if (!v || typeof v !== "object") return null;
  const r = v as Record<string, unknown>;
  return {
    especies: toNumArr(r.especies),
    descricao: toStr(r.descricao),
    idade_minima: toNullableNum(r.idade_minima),
    excecao: toNullableStr(r.excecao),
  };
}

function toArr<T>(v: unknown, mapper: (x: unknown) => T | null): T[] {
  if (!Array.isArray(v)) return [];
  return v.map(mapper).filter((x): x is T => x !== null);
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZAÇÃO DO TIPO DE OPERAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

const TIPOS_VALIDOS = new Set<string>(TIPOS_OPERACAO);

export function normalizarTipoOperacao(valor: unknown): TipoOperacao | null {
  if (typeof valor !== "string" || !valor) return null;
  const upper = valor.toUpperCase().replace(/[-\s]/g, "_");
  if (TIPOS_VALIDOS.has(upper)) return upper as TipoOperacao;
  if (upper.includes("PORT") && upper.includes("REFIN")) return "PORTABILIDADE_REFIN";
  if (upper === "PORT_REFIN") return "PORTABILIDADE_REFIN";
  if (upper === "MARGEM_NOVA" || upper === "NOVO" || upper === "NOVA") return "EMPRESTIMO_CONSIGNADO";
  if (upper.includes("EMPRESTIMO") || upper.includes("EMPRÉSTIMO")) return "EMPRESTIMO_CONSIGNADO";
  if (upper.includes("PORTABILIDADE")) return "PORTABILIDADE";
  if (upper.includes("REFINANCIAMENTO") || upper.includes("REFIN")) return "REFINANCIAMENTO";
  if (upper.includes("CARTAO_BENEF") || upper.includes("CARTÃO_BENEF") || upper === "RCC")
    return "CARTAO_BENEFICIO";
  if (upper.includes("CARTAO") || upper.includes("CARTÃO") || upper === "RMC")
    return "CARTAO_CONSIGNADO";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// NORMALIZADOR PRINCIPAL — produz `RegraExtraida` canônica a partir de qualquer JSON
// ─────────────────────────────────────────────────────────────────────────────

// Campos onde 0 retornado pelo modelo significa "não encontrado" (não "valor real é zero")
const CAMPOS_ZERO_E_NULL = new Set([
  "taxa_minima_am",
  "taxa_maxima_am",
  "troco_minimo_liberado",
  "limite_cartao_minimo",
  "limite_cartao_maximo",
  "fator_rmc",
  "parcela_minima",
  "saldo_devedor_maximo",
  "margem_loas_pct",
]);

function zeroParaNull(campo: string, v: number | null): number | null {
  if (v === 0 && CAMPOS_ZERO_E_NULL.has(campo)) return null;
  return v;
}

export function normalizarRegra(raw: unknown): RegraExtraida | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const tipo = normalizarTipoOperacao(r.tipo_operacao);
  if (!tipo) return null;

  return {
    tipo_operacao: tipo,
    produto_nome_sugerido: toStr(r.produto_nome_sugerido),
    convenio_nome: toStr(r.convenio_nome),

    faixas_etarias: toArr(r.faixas_etarias, toFaixa),
    especies_aceitas: toStrArr(r.especies_aceitas),
    especies_bloqueadas: toStrArr(r.especies_bloqueadas),

    margem_padrao_pct: toNullableNum(r.margem_padrao_pct),
    margem_loas_pct: zeroParaNull("margem_loas_pct", toNullableNum(r.margem_loas_pct)),

    valor_min: toNullableNum(r.valor_min),
    valor_max: toNullableNum(r.valor_max),

    parcelas_min_pagas: toNullableNum(r.parcelas_min_pagas),

    agrega_margem: toNullableBool(r.agrega_margem),
    permite_margem_negativa: toNullableBool(r.permite_margem_negativa),
    permite_reduzir_parcela: toNullableBool(r.permite_reduzir_parcela),

    max_contratos_unica_digitacao: toNullableNum(r.max_contratos_unica_digitacao),
    taxa_minima_am: zeroParaNull("taxa_minima_am", toNullableNum(r.taxa_minima_am)),
    taxa_maxima_am: zeroParaNull("taxa_maxima_am", toNullableNum(r.taxa_maxima_am)),

    max_contratos_por_beneficio: toNullableNum(r.max_contratos_por_beneficio),
    data_corte: toStr(r.data_corte),

    limite_cartao_minimo: zeroParaNull("limite_cartao_minimo", toNullableNum(r.limite_cartao_minimo)),
    limite_cartao_maximo: zeroParaNull("limite_cartao_maximo", toNullableNum(r.limite_cartao_maximo)),
    fator_rmc: zeroParaNull("fator_rmc", toNullableNum(r.fator_rmc)),
    parcela_minima: zeroParaNull("parcela_minima", toNullableNum(r.parcela_minima)),
    saldo_devedor_maximo: zeroParaNull("saldo_devedor_maximo", toNullableNum(r.saldo_devedor_maximo)),
    troco_minimo_liberado: zeroParaNull("troco_minimo_liberado", toNullableNum(r.troco_minimo_liberado)),

    versao_roteiro: toNullableStr(r.versao_roteiro),
    data_atualizacao_roteiro: toNullableStr(r.data_atualizacao_roteiro),
    validade_roteiro: toNullableStr(r.validade_roteiro),

    bancos_pagamento: toArr(r.bancos_pagamento, toBancoPagamento),
    documentos_obrigatorios: toStrArr(r.documentos_obrigatorios),
    publico_excluido: toStrArr(r.publico_excluido),
    restricoes_por_especie: toArr(r.restricoes_por_especie, toRestricaoEspecie),

    representante_legal_permitido: toNullableBool(r.representante_legal_permitido),
    idade_max_representante: toNullableNum(r.idade_max_representante),
    analfabeto_permitido: toNullableBool(r.analfabeto_permitido),
    uf_bloqueadas: toStrArr(r.uf_bloqueadas),
    ddb_minimo_dias: toNullableNum(r.ddb_minimo_dias),

    observacoes: toStr(r.observacoes),
  };
}

export function normalizarResposta(raw: unknown): RespostaLLM {
  const parsed = RawRespostaSchema.safeParse(raw);
  const data = parsed.success ? parsed.data : ((raw ?? {}) as Record<string, unknown>);
  const regrasArr = Array.isArray(data.regras) ? data.regras : [];
  return {
    banco_nome: toStr((data as Record<string, unknown>).banco_nome),
    versao_roteiro: toStr((data as Record<string, unknown>).versao_roteiro),
    regras: regrasArr
      .map(normalizarRegra)
      .filter((r): r is RegraExtraida => r !== null),
  };
}

export const norm = (s: string | null | undefined): string =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

// ─────────────────────────────────────────────────────────────────────────────
// JSON Schema do Gemini (responseSchema nativo) — versão simplificada
// ─────────────────────────────────────────────────────────────────────────────

const SCHEMA_GEMINI = {
  type: "object" as const,
  properties: {
    banco_nome: { type: "string" as const },
    versao_roteiro: { type: "string" as const },
    regras: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          tipo_operacao: { type: "string" as const, enum: [...TIPOS_OPERACAO] },
          produto_nome_sugerido: { type: "string" as const },
          convenio_nome: { type: "string" as const },
          faixas_etarias: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                idade_min: { type: "number" as const, nullable: true },
                idade_max: { type: "number" as const, nullable: true },
                prazo_max: { type: "number" as const, nullable: true },
                valor_max: { type: "number" as const, nullable: true },
                observacao: { type: "string" as const, nullable: true },
              },
            },
          },
          especies_aceitas: { type: "array" as const, items: { type: "string" as const } },
          especies_bloqueadas: { type: "array" as const, items: { type: "string" as const } },
          margem_padrao_pct: { type: "number" as const, nullable: true },
          margem_loas_pct: { type: "number" as const, nullable: true },
          valor_min: { type: "number" as const, nullable: true },
          valor_max: { type: "number" as const, nullable: true },
          parcelas_min_pagas: { type: "number" as const, nullable: true },
          agrega_margem: { type: "boolean" as const, nullable: true },
          permite_margem_negativa: { type: "boolean" as const, nullable: true },
          permite_reduzir_parcela: { type: "boolean" as const, nullable: true },
          max_contratos_unica_digitacao: { type: "number" as const, nullable: true },
          taxa_minima_am: { type: "number" as const, nullable: true },
          taxa_maxima_am: { type: "number" as const, nullable: true },
          max_contratos_por_beneficio: { type: "number" as const, nullable: true },
          data_corte: { type: "string" as const, nullable: true },
          limite_cartao_minimo: { type: "number" as const, nullable: true },
          limite_cartao_maximo: { type: "number" as const, nullable: true },
          fator_rmc: { type: "number" as const, nullable: true },
          parcela_minima: { type: "number" as const, nullable: true },
          saldo_devedor_maximo: { type: "number" as const, nullable: true },
          troco_minimo_liberado: { type: "number" as const, nullable: true },
          versao_roteiro: { type: "string" as const, nullable: true },
          data_atualizacao_roteiro: { type: "string" as const, nullable: true },
          validade_roteiro: { type: "string" as const, nullable: true },
          bancos_pagamento: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                codigo: { type: "string" as const },
                nome: { type: "string" as const },
              },
            },
          },
          documentos_obrigatorios: { type: "array" as const, items: { type: "string" as const } },
          publico_excluido: { type: "array" as const, items: { type: "string" as const } },
          restricoes_por_especie: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                especies: { type: "array" as const, items: { type: "number" as const } },
                descricao: { type: "string" as const },
                idade_minima: { type: "number" as const, nullable: true },
                excecao: { type: "string" as const, nullable: true },
              },
            },
          },
          observacoes: { type: "string" as const },
        },
      },
    },
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE PRINCIPAL — Gemini Pro → Gemini Flash → Claude (qualquer um basta)
// ─────────────────────────────────────────────────────────────────────────────

export type ExtracaoOk = {
  ok: true;
  banco_nome: string;
  versao_roteiro: string;
  regras: RegraExtraida[];
  modelo_usado: string;
};

export type ExtracaoErro = {
  ok: false;
  error: string;
  modelo_tentado: string;
};

export type ResultadoExtracao = ExtracaoOk | ExtracaoErro;

const MODELO_GEMINI_PRO = "gemini-2.5-pro";          // Principal
const MODELO_GEMINI_FLASH = "gemini-flash-latest";         // Fallback estável
const MODELO_CLAUDE = "claude-3-5-sonnet-20241022";

const TIMEOUT_GERAL_MS = 280_000;
const TIMEOUT_LLM_MS = 210_000;

export async function extrairRegrasDePdf(input: {
  pdfUrl?: string;
  pdfBuffer?: Buffer | Uint8Array;
  bancoHint?: string;
  mediaType?: string;
}): Promise<ResultadoExtracao> {
  const timeoutPromise = new Promise<ResultadoExtracao>((resolve) =>
    setTimeout(
      () =>
        resolve({
          ok: false,
          error: `Processamento excedeu ${TIMEOUT_GERAL_MS / 1000}s`,
          modelo_tentado: "timeout_geral",
        }),
      TIMEOUT_GERAL_MS
    )
  );
  return Promise.race([extrairRegrasDePdfInternal(input), timeoutPromise]);
}

async function extrairRegrasDePdfInternal(input: {
  pdfUrl?: string;
  pdfBuffer?: Buffer | Uint8Array;
  bancoHint?: string;
  mediaType?: string;
}): Promise<ResultadoExtracao> {
  const { pdfUrl, pdfBuffer, bancoHint, mediaType = "application/pdf" } = input;

  // Resolve buffer
  let buffer: Uint8Array | undefined =
    pdfBuffer instanceof Uint8Array ? pdfBuffer : pdfBuffer ? new Uint8Array(pdfBuffer) : undefined;

  if (!buffer && pdfUrl) {
    const res = await fetch(pdfUrl);
    if (!res.ok) {
      return {
        ok: false,
        error: `Falha ao baixar arquivo: ${res.status} ${res.statusText}`,
        modelo_tentado: "download",
      };
    }
    buffer = new Uint8Array(await res.arrayBuffer());
  }

  if (!buffer) {
    return { ok: false, error: "Nenhum arquivo fornecido", modelo_tentado: "" };
  }

  const promptText = buildPromptExtracao(bancoHint);
  const tentativas: Array<{ modelo: string; erro: string }> = [];

  // 1) Gemini Pro
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    const t1 = await tentarGemini(MODELO_GEMINI_PRO, buffer, mediaType, promptText);
    if (t1.ok) return t1;
    tentativas.push({ modelo: MODELO_GEMINI_PRO, erro: (t1 as ExtracaoErro).error });

    // 2) Gemini Flash
    const t2 = await tentarGemini(MODELO_GEMINI_FLASH, buffer, mediaType, promptText);
    if (t2.ok) return t2;
    tentativas.push({ modelo: MODELO_GEMINI_FLASH, erro: (t2 as ExtracaoErro).error });
  }

  // 3) Claude
  if (process.env.ANTHROPIC_API_KEY) {
    const t3 = await tentarClaude(buffer, mediaType, promptText);
    if (t3.ok) return t3;
    tentativas.push({ modelo: MODELO_CLAUDE, erro: (t3 as ExtracaoErro).error });
  }

  return {
    ok: false,
    error:
      tentativas.length > 0
        ? `Todas as LLMs falharam:\n${tentativas.map((t) => `• ${t.modelo}: ${t.erro}`).join("\n")}`
        : "Nenhuma API key configurada (GOOGLE_GENERATIVE_AI_API_KEY ou ANTHROPIC_API_KEY)",
    modelo_tentado: tentativas.map((t) => t.modelo).join(","),
  };
}

async function tentarGemini(
  modelId: string,
  buffer: Uint8Array,
  mediaType: string,
  promptText: string,
  maxRetries = 3
): Promise<ResultadoExtracao> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

      const blob = new Blob([buffer as unknown as BlobPart], { type: mediaType });
      console.log(
        `[motor-regras] ${modelId} ← upload (${(buffer.length / 1024 / 1024).toFixed(1)}MB, ${mediaType}) tentativa ${attempt}/${maxRetries}`
      );
      const upload = await ai.files.upload({ file: blob, config: { mimeType: mediaType } });
      if (!upload.uri) {
        return { ok: false, error: "Files API não retornou URI", modelo_tentado: modelId };
      }

      const promise = ai.models.generateContent({
        model: modelId,
        contents: [
          {
            role: "user",
            parts: [
              { fileData: { fileUri: upload.uri, mimeType: upload.mimeType || mediaType } },
              { text: promptText },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: SCHEMA_GEMINI,
          thinkingConfig: { thinkingBudget: 0 },
        },
      });

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`${modelId} timeout (${TIMEOUT_LLM_MS / 1000}s)`)), TIMEOUT_LLM_MS)
      );

      const result = await Promise.race([promise, timeout]);
      const rawText = result.text || "";
      if (!rawText) return { ok: false, error: `${modelId} retornou vazio`, modelo_tentado: modelId };

      const jsonText = extrairJson(rawText);
      if (!jsonText) {
        return { ok: false, error: `${modelId} sem JSON válido`, modelo_tentado: modelId };
      }

      const parsedRaw = JSON.parse(jsonText);
      const normalizada = normalizarResposta(parsedRaw);
      if (!normalizada.regras.length) {
        return {
          ok: false,
          error: `${modelId} não identificou regras estruturadas`,
          modelo_tentado: modelId,
        };
      }
      return {
        ok: true,
        banco_nome: normalizada.banco_nome,
        versao_roteiro: normalizada.versao_roteiro,
        regras: normalizada.regras,
        modelo_usado: modelId,
      };
    } catch (e) {
      const msg = (e as Error).message || "";
      // Retry automático para erros 503 (UNAVAILABLE) e 429 (rate limit)
      const isRetryable = msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("overloaded");
      if (isRetryable && attempt < maxRetries) {
        const waitMs = attempt * 5000; // 5s, 10s, 15s
        console.log(`[motor-regras] ${modelId} erro transiente (${msg.slice(0, 80)}), aguardando ${waitMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      return { ok: false, error: msg, modelo_tentado: modelId };
    }
  }
  return { ok: false, error: `${modelId} falhou após ${maxRetries} tentativas`, modelo_tentado: modelId };
}

async function tentarClaude(
  buffer: Uint8Array,
  mediaType: string,
  promptText: string
): Promise<ResultadoExtracao> {
  try {
    const promptComJson =
      promptText +
      `\n\nRESPONDA EXCLUSIVAMENTE COM UM JSON VÁLIDO no formato:
{
  "banco_nome": "...",
  "versao_roteiro": "...",
  "regras": [ { "tipo_operacao": "...", ... }, ... ]
}
Sem markdown, sem texto antes/depois. Para campos não identificados use null.`;

    const { text } = await generateText({
      model: anthropic(MODELO_CLAUDE),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: promptComJson },
            { type: "file", data: buffer, mediaType },
          ],
        },
      ],
    });

    const jsonText = extrairJson(text);
    if (!jsonText) {
      return { ok: false, error: "Claude sem JSON válido", modelo_tentado: MODELO_CLAUDE };
    }
    const parsedRaw = JSON.parse(jsonText);
    const normalizada = normalizarResposta(parsedRaw);
    if (!normalizada.regras.length) {
      return {
        ok: false,
        error: "Claude não identificou regras estruturadas",
        modelo_tentado: MODELO_CLAUDE,
      };
    }
    return {
      ok: true,
      banco_nome: normalizada.banco_nome,
      versao_roteiro: normalizada.versao_roteiro,
      regras: normalizada.regras,
      modelo_usado: MODELO_CLAUDE,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message, modelo_tentado: MODELO_CLAUDE };
  }
}

function extrairJson(texto: string): string | null {
  if (!texto) return null;
  const fenced = texto.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const trimmed = texto.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return null;
}

// Mantém o nome legado para compatibilidade com salvar/route.ts
export { normalizarRegra as limparZerosInvalidos };
