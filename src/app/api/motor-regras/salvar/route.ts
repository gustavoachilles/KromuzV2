// POST /api/motor-regras/salvar
//
// Persiste as regras revisadas após a extração via LLM.
// Estratégia: para cada regra extraída, faz upsert em RegraProdutoCredito
// (chave única: empresa_id × banco_id × produto_id × tipo_operacao).
// Se o produto canônico não existir, cria automaticamente.

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { TipoOperacao } from "@prisma/client";
import { normalizarTipoOperacao } from "@/lib/motor-regras/extrair";
import { salvarRegrasNoBanco } from "@/lib/motor-regras/salvar";
import { getSessionEmpresaApi } from "@/lib/session";

export const runtime = "nodejs";

const FaixaEtariaSchema = z.object({
  idade_min: z.number().nullable(),
  idade_max: z.number().nullable(),
  prazo_max: z.number().nullable(),
  valor_max: z.number().nullable(),
  observacao: z.string().nullable().optional(),
});

const RegraSchema = z.object({
  tipo_operacao: z.string(),
  tipo_operacao_normalizado: z.string().nullable().optional(),
  produto_nome_sugerido: z.string(),
  convenio_nome: z.string().nullable().optional(),
  faixas_etarias: z.array(FaixaEtariaSchema).default([]),
  especies_aceitas: z.array(z.string()).default([]),
  especies_bloqueadas: z.array(z.string()).default([]),
  margem_padrao_pct: z.number().nullable().optional(),
  margem_loas_pct: z.number().nullable().optional(),
  valor_min: z.number().nullable().optional(),
  valor_max: z.number().nullable().optional(),
  parcelas_min_pagas: z.number().nullable().optional(),
  agrega_margem: z.boolean().nullable().optional(),
  permite_margem_negativa: z.boolean().nullable().optional(),
  permite_reduzir_parcela: z.boolean().nullable().optional(),
  max_contratos_unica_digitacao: z.number().nullable().optional(),
  taxa_minima_am: z.number().nullable().optional(),
  taxa_maxima_am: z.number().nullable().optional(),
  max_contratos_por_beneficio: z.number().nullable().optional(),
  data_corte: z.string().nullable().optional(),
  limite_cartao_minimo: z.number().nullable().optional(),
  limite_cartao_maximo: z.number().nullable().optional(),
  fator_rmc: z.number().nullable().optional(),
  parcela_minima: z.number().nullable().optional(),
  saldo_devedor_maximo: z.number().nullable().optional(),
  troco_minimo_liberado: z.number().nullable().optional(),
  versao_roteiro: z.string().nullable().optional(),
  data_atualizacao_roteiro: z.string().nullable().optional(),
  validade_roteiro: z.string().nullable().optional(),
  bancos_pagamento: z
    .array(z.object({ codigo: z.string(), nome: z.string() }))
    .default([]),
  documentos_obrigatorios: z.array(z.string()).default([]),
  publico_excluido: z.array(z.string()).default([]),
  restricoes_por_especie: z.array(z.unknown()).default([]),
  observacoes: z.string().nullable().optional(),
  sugestao_produto_id: z.string().min(1).nullable().optional(),
  sugestao_convenio_id: z.string().min(1).nullable().optional(),
});

const PayloadSchema = z.object({
  banco_id: z.string().min(1).optional(),
  banco_nome: z.string().optional(),
  importacao_pdf_id: z.string().min(1).optional(),
  regras: z.array(RegraSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) {
      return Response.json({ ok: false, error: "Não autorizado" }, { status: 401 });
    }
    const empresaId = sessao.empresaId;

    const body = PayloadSchema.parse(await req.json());
    const { importacao_pdf_id, regras } = body;
    let bancoId = body.banco_id;
    let bancoNome = body.banco_nome ?? "";

    const resultado = await salvarRegrasNoBanco({
      empresaId: empresaId,
      bancoIdInput: bancoId,
      bancoNomeInput: bancoNome,
      importacaoPdfId: importacao_pdf_id,
      regras,
    });

    if (!resultado.ok && !resultado.salvas?.length) {
      return Response.json(resultado, { status: 400 });
    }

    return Response.json(resultado);
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 400 });
  }
}
