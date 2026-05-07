import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/convenios/[id] — detalhe do convênio com bancos vinculados
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const convenio = await prisma.convenio.findFirst({
    where: { id, empresaId: sessao.empresaId },
    include: {
      bancoConvenios: {
        where: { ativo: true },
        include: {
          banco: { select: { id: true, nome: true, ativoSimulacao: true } },
        },
      },
      _count: {
        select: {
          tabelasCoeficiente: { where: { ativo: true } },
          regrasProduto: { where: { ativa: true } },
        },
      },
    },
  });

  if (!convenio) return Response.json({ error: "Convênio não encontrado" }, { status: 404 });

  return Response.json(convenio);
}

const AtualizarConvenioSchema = z.object({
  nome: z.string().min(2).optional(),
  tipo: z.string().nullable().optional(),
  descricao: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
});

// PATCH /api/convenios/[id] — edita convênio
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existe = await prisma.convenio.findFirst({
    where: { id, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!existe) return Response.json({ error: "Convênio não encontrado" }, { status: 404 });

  try {
    const body = AtualizarConvenioSchema.parse(await req.json());
    const convenio = await prisma.convenio.update({
      where: { id },
      data: body,
    });
    return Response.json(convenio);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

// DELETE /api/convenios/[id] — soft-delete
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existe = await prisma.convenio.findFirst({
    where: { id, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!existe) return Response.json({ error: "Convênio não encontrado" }, { status: 404 });

  await prisma.convenio.update({
    where: { id },
    data: { ativo: false },
  });

  return Response.json({ ok: true });
}
