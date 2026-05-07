import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// POST /api/convenios/[id]/bancos — vincula banco ao convênio
export async function POST(req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id: convenioId } = await params;

  // Valida convênio pertence à empresa
  const convenio = await prisma.convenio.findFirst({
    where: { id: convenioId, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!convenio) return Response.json({ error: "Convênio não encontrado" }, { status: 404 });

  const { bancoId } = z.object({ bancoId: z.string().uuid() }).parse(await req.json());

  // Valida banco pertence à empresa
  const banco = await prisma.banco.findFirst({
    where: { id: bancoId, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!banco) return Response.json({ error: "Banco não encontrado" }, { status: 404 });

  try {
    const vinculo = await prisma.bancoConvenio.create({
      data: {
        empresaId: sessao.empresaId,
        bancoId,
        convenioId,
        ativo: true,
      },
    });
    return Response.json(vinculo, { status: 201 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return Response.json({ error: "Este banco já está vinculado a este convênio." }, { status: 409 });
    }
    return Response.json({ error: e.message }, { status: 400 });
  }
}

// DELETE /api/convenios/[id]/bancos — desvincula banco
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id: convenioId } = await params;
  const { bancoId } = z.object({ bancoId: z.string().uuid() }).parse(await req.json());

  const vinculo = await prisma.bancoConvenio.findFirst({
    where: { empresaId: sessao.empresaId, bancoId, convenioId },
    select: { id: true },
  });
  if (!vinculo) return Response.json({ error: "Vínculo não encontrado" }, { status: 404 });

  await prisma.bancoConvenio.update({
    where: { id: vinculo.id },
    data: { ativo: false },
  });

  return Response.json({ ok: true });
}
