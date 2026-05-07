import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/regras/[id] — detalhe completo de uma regra
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const regra = await prisma.regraProdutoCredito.findFirst({
    where: { id, empresaId: sessao.empresaId },
    include: {
      banco: { select: { id: true, nome: true } },
      produto: { select: { id: true, nomeProduto: true, tipoProduto: true } },
      convenio: { select: { id: true, nome: true } },
      importacaoPdf: { select: { id: true, nomeArquivo: true, modeloIa: true, createdAt: true } },
    },
  });

  if (!regra) return Response.json({ error: "Regra não encontrada" }, { status: 404 });

  return Response.json(regra);
}

const PatchRegraSchema = z.object({
  ativa: z.boolean().optional(),
  prioridade: z.number().int().optional(),
  margemPadraoPct: z.number().nullable().optional(),
  margemLoasPct: z.number().nullable().optional(),
  margemNovaValorMin: z.number().nullable().optional(),
  margemNovaValorMax: z.number().nullable().optional(),
  refinParcelasMinPagas: z.number().int().nullable().optional(),
  refinAgregaMargem: z.boolean().nullable().optional(),
  refinPermiteMargemNeg: z.boolean().nullable().optional(),
  refinValorMin: z.number().nullable().optional(),
  refinTrocoMin: z.number().nullable().optional(),
  portParcelasMinPagas: z.number().int().nullable().optional(),
  portValorMin: z.number().nullable().optional(),
  portPermiteReduzirParc: z.boolean().nullable().optional(),
  portPermiteMargemNeg: z.boolean().nullable().optional(),
  portMaxContratosUnica: z.number().int().nullable().optional(),
  taxaMinimaAm: z.number().nullable().optional(),
  taxaMaximaAm: z.number().nullable().optional(),
  maxContratosPorBeneficio: z.number().int().nullable().optional(),
  limiteCartaoMinimo: z.number().nullable().optional(),
  limiteCartaoMaximo: z.number().nullable().optional(),
  fatorRmc: z.number().nullable().optional(),
  parcelaMinima: z.number().nullable().optional(),
  saldoDevedorMaximo: z.number().nullable().optional(),
  trocoMinimoLiberado: z.number().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

// PATCH /api/regras/[id] — edita campos da regra
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existe = await prisma.regraProdutoCredito.findFirst({
    where: { id, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!existe) return Response.json({ error: "Regra não encontrada" }, { status: 404 });

  try {
    const body = PatchRegraSchema.parse(await req.json());

    // Só marca como "manual" se alterou campos de valor (não apenas ativa/prioridade)
    const camposDeValor = Object.keys(body).filter(k => k !== "ativa" && k !== "prioridade");
    const data: any = { ...body };
    if (camposDeValor.length > 0) {
      data.fonteTipo = "manual";
    }

    const regra = await prisma.regraProdutoCredito.update({
      where: { id },
      data,
    });

    return Response.json(regra);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
