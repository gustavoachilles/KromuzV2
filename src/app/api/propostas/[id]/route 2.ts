import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/propostas/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const proposta = await prisma.proposta.findFirst({
    where: { id, empresaId: sessao.empresaId },
  });
  if (!proposta) return Response.json({ error: "Proposta não encontrada" }, { status: 404 });

  return Response.json(proposta);
}

const AtualizarPropostaSchema = z.object({
  status: z.enum(["RASCUNHO", "SIMULADA", "DIGITADA", "PENDENTE", "APROVADA", "REPROVADA", "PAGA", "CANCELADA"]).optional(),
  clienteNome: z.string().min(2).optional(),
  clienteTelefone: z.string().optional(),
  valorParcela: z.number().optional(),
  valorLiberado: z.number().optional(),
  prazo: z.number().int().optional(),
  taxaJuros: z.number().optional(),
  valorComissao: z.number().optional(),
  observacoes: z.string().nullable().optional(),
  bancoNome: z.string().optional(),
  produtoNome: z.string().optional(),
});

// PATCH /api/propostas/[id] — edita proposta / muda status
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const existe = await prisma.proposta.findFirst({
    where: { id, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!existe) return Response.json({ error: "Proposta não encontrada" }, { status: 404 });

  try {
    const body = AtualizarPropostaSchema.parse(await req.json());

    // Auto-fill datas do funil
    const dataUpdates: Record<string, Date> = {};
    if (body.status === "DIGITADA") dataUpdates.digitadaEm = new Date();
    if (body.status === "APROVADA") dataUpdates.aprovadaEm = new Date();
    if (body.status === "PAGA") dataUpdates.pagaEm = new Date();
    if (body.status === "CANCELADA") dataUpdates.canceladaEm = new Date();

    const proposta = await prisma.proposta.update({
      where: { id },
      data: { ...body, ...dataUpdates },
    });

    return Response.json(proposta);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
