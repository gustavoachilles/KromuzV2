import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/leads/[id]/margens — Atualiza margens do Lead a partir do HISCON
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
  const { id } = await params;

  const existe = await prisma.lead.findFirst({
    where: { id, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!existe) return Response.json({ error: "Lead não encontrado" }, { status: 404 });

  const body = await req.json();

  const updateData: any = {
    dataAtualizacaoMargens: new Date(),
  };

  if (body.margemLivre !== undefined) updateData.margemLivre = body.margemLivre;
  if (body.margemRmc !== undefined) updateData.margemRmc = body.margemRmc;
  if (body.margemRcc !== undefined) updateData.margemRcc = body.margemRcc;
  if (body.margemExtrapolada !== undefined) updateData.margemExtrapolada = body.margemExtrapolada;
  if (body.numeroBeneficio) updateData.numeroBeneficio = body.numeroBeneficio;
  if (body.especieBeneficio) updateData.especieBeneficio = body.especieBeneficio;
  if (body.renda) updateData.renda = body.renda;
  if (body.bancoCliente) updateData.bancoCliente = body.bancoCliente;
  if (body.agenciaCliente) updateData.agenciaCliente = body.agenciaCliente;
  if (body.contaCliente) updateData.contaCliente = body.contaCliente;
  if (body.tipoContaCliente) updateData.tipoContaCliente = body.tipoContaCliente;

  const lead = await prisma.lead.update({
    where: { id },
    data: updateData,
  });

  return Response.json(lead);
}
