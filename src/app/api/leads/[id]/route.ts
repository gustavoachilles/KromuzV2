import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/leads/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id, empresaId: sessao.empresaId },
  });
  if (!lead) return Response.json({ error: "Lead não encontrado" }, { status: 404 });

  return Response.json(lead);
}

const AtualizarLeadSchema = z.object({
  nome: z.string().min(2).optional(),
  cpf: z.string().nullable().optional(),
  telefone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  uf: z.string().max(2).nullable().optional(),
  cidade: z.string().nullable().optional(),
  numeroBeneficio: z.string().nullable().optional(),
  especieBeneficio: z.number().nullable().optional(),
  origem: z.string().nullable().optional(),
  canalContato: z.string().nullable().optional(),
  convenioNome: z.string().nullable().optional(),
  status: z.string().optional(),
  observacoes: z.string().nullable().optional(),
  motivoPerda: z.string().nullable().optional(),
  tipoOperacao: z.enum([
    "EMPRESTIMO_CONSIGNADO", "REFINANCIAMENTO", "PORTABILIDADE",
    "PORTABILIDADE_REFIN", "CARTAO_CONSIGNADO", "CARTAO_BENEFICIO",
  ]).nullable().optional(),
  valorEstimado: z.number().nullable().optional(),
  bancoPreferido: z.string().nullable().optional(),
  margemLivre: z.number().nullable().optional(),
  margemRmc: z.number().nullable().optional(),
  margemRcc: z.number().nullable().optional(),
  ultimoContato: z.string().datetime().nullable().optional(),
  proximoContato: z.string().datetime().nullable().optional(),
});

// PATCH /api/leads/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const existe = await prisma.lead.findFirst({
    where: { id, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!existe) return Response.json({ error: "Lead não encontrado" }, { status: 404 });

  try {
    const body = AtualizarLeadSchema.parse(await req.json());

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...body,
        ultimoContato: body.ultimoContato ? new Date(body.ultimoContato) : undefined,
        proximoContato: body.proximoContato ? new Date(body.proximoContato) : undefined,
      },
    });

    return Response.json(lead);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

// DELETE /api/leads/[id]
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const existe = await prisma.lead.findFirst({
    where: { id, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!existe) return Response.json({ error: "Lead não encontrado" }, { status: 404 });

  await prisma.lead.delete({ where: { id } });

  return Response.json({ ok: true });
}
