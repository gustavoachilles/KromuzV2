// POST /api/motor-regras/extrair-pdf
//
// Aceita 3 formatos de entrada:
//  1. multipart/form-data com `arquivo` (File) — bom para arquivos pequenos (< 4 MB)
//  2. JSON com `pdf_url` — bom para arquivos grandes (já no Storage do Supabase)
//  3. JSON com `pdf_base64` — fallback caso o cliente não consiga fazer upload
//
// Aceita PDFs e imagens (JPG/PNG/WEBP/HEIC). O mediaType é detectado pelo nome do
// arquivo OU pelo Content-Type, com fallback para application/pdf.

import { NextRequest } from "next/server";
import { extrairRegrasDePdf } from "@/lib/motor-regras/extrair";
import { casarBanco, enriquecerRegras } from "@/lib/motor-regras/sugestoes";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { getSessionEmpresaApi } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

const JsonBodySchema = z.object({
  pdf_url: z.string().url().optional(),
  pdf_base64: z.string().optional(),
  nome_arquivo: z.string().optional(),
  media_type: z.string().optional(),
  banco_hint: z.string().optional(),
  empresa_id: z.string().optional(), // opcional pois usaremos da sessão
});

function detectarMediaType(nome: string, fallback?: string): string {
  const lower = nome.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.match(/\.(jpe?g)$/)) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.match(/\.heic|\.heif$/)) return "image/heic";
  return fallback || "application/pdf";
}

export async function POST(req: NextRequest) {
  const inicio = Date.now();
  
  const sessao = await getSessionEmpresaApi();
  if (!sessao) {
    return Response.json({ ok: false, error: "Não autorizado" }, { status: 401 });
  }
  const empresaId = sessao.empresaId;

  const contentType = req.headers.get("content-type") || "";

  let pdfBuffer: Uint8Array | undefined;
  let pdfUrl: string | undefined;
  let mediaType = "application/pdf";
  let nomeArquivo = "anexo.pdf";
  let bancoHint: string | undefined;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("arquivo");
      if (!(file instanceof File)) {
        return Response.json(
          { ok: false, error: 'Campo "arquivo" obrigatório (File).' },
          { status: 400 }
        );
      }
      nomeArquivo = file.name || nomeArquivo;
      mediaType = detectarMediaType(nomeArquivo, file.type);
      pdfBuffer = new Uint8Array(await file.arrayBuffer());
      bancoHint = (form.get("banco_hint") as string) || undefined;
    } else {
      const body = JsonBodySchema.parse(await req.json());

      pdfUrl = body.pdf_url;
      bancoHint = body.banco_hint;
      nomeArquivo = body.nome_arquivo || pdfUrl?.split("/").pop() || nomeArquivo;
      mediaType = detectarMediaType(nomeArquivo, body.media_type);

      if (body.pdf_base64) {
        pdfBuffer = new Uint8Array(Buffer.from(body.pdf_base64, "base64"));
      }

      if (!pdfUrl && (!pdfBuffer || pdfBuffer.length === 0)) {
        return Response.json(
          { ok: false, error: "Forneça pdf_url, pdf_base64 ou multipart/form-data com arquivo." },
          { status: 400 }
        );
      }
    }
  } catch (e) {
    return Response.json(
      { ok: false, error: `Payload inválido: ${(e as Error).message}` },
      { status: 400 }
    );
  }

  // Job de importação (rastreabilidade)
  const job = await prisma.importacaoPDF.create({
    data: {
      empresaId,
      arquivoUrl: pdfUrl ?? "(buffer)",
      nomeArquivo,
      bancoHint,
      status: "processando",
      progresso: 10,
      etapa: "Enviando ao LLM",
      iniciadoEm: new Date(),
    },
  });

  try {
    const resultado = await extrairRegrasDePdf({ pdfUrl, pdfBuffer, bancoHint, mediaType });

    if (!resultado.ok) {
      await prisma.importacaoPDF.update({
        where: { id: job.id },
        data: {
          status: "erro",
          progresso: 100,
          etapa: "Falha na extração",
          erro: resultado.error,
          modeloIa: resultado.modelo_tentado,
          concluidoEm: new Date(),
        },
      });
      return Response.json(resultado, { status: 422 });
    }

    const bancoMatch = await casarBanco(empresaId, resultado.banco_nome, bancoHint);
    const regrasEnriquecidas = await enriquecerRegras(
      empresaId,
      bancoMatch?.id ?? null,
      resultado.regras
    );

    const ms = Date.now() - inicio;

    await prisma.importacaoPDF.update({
      where: { id: job.id },
      data: {
        status: "concluido",
        progresso: 100,
        etapa: "Concluído",
        modeloIa: resultado.modelo_usado,
        resultado: {
          banco_nome_ia: resultado.banco_nome,
          versao_roteiro: resultado.versao_roteiro,
          banco_match: bancoMatch,
          total_regras: regrasEnriquecidas.length,
          tempo_ms: ms,
        },
        concluidoEm: new Date(),
      },
    });

    return Response.json({
      ok: true,
      job_id: job.id,
      banco_nome_ia: resultado.banco_nome,
      versao_roteiro: resultado.versao_roteiro,
      sugestao_banco: bancoMatch,
      modelo_usado: resultado.modelo_usado,
      tempo_ms: ms,
      regras: regrasEnriquecidas,
    });
  } catch (error) {
    await prisma.importacaoPDF.update({
      where: { id: job.id },
      data: {
        status: "erro",
        progresso: 100,
        etapa: "Exceção não tratada",
        erro: (error as Error).message,
        concluidoEm: new Date(),
      },
    });
    return Response.json(
      { ok: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
