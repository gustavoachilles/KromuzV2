import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/produtos/[id]
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const produto = await prisma.produtoCredito.findFirst({
    where: { id, empresaId: sessao.empresaId },
    include: {
      banco: { select: { id: true, nome: true } },
      convenio: { select: { id: true, nome: true } },
      tabelasCoeficiente: {
        where: { ativo: true },
        orderBy: { prazo: "asc" },
      },
      regras: {
        where: { ativa: true },
        take: 5,
      },
    },
  });

  if (!produto) return Response.json({ error: "Produto não encontrado" }, { status: 404 });

  return Response.json(produto);
}

const AtualizarProdutoSchema = z.object({
  nomeProduto: z.string().min(2).optional(),
  prazoMaximo: z.number().int().positive().nullable().optional(),
  taxaMedia: z.number().positive().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
});

// PATCH /api/produtos/[id]
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existe = await prisma.produtoCredito.findFirst({
    where: { id, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!existe) return Response.json({ error: "Produto não encontrado" }, { status: 404 });

  try {
    const body = AtualizarProdutoSchema.parse(await req.json());
    const produto = await prisma.produtoCredito.update({
      where: { id },
      data: body,
    });
    return Response.json(produto);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

// DELETE /api/produtos/[id] — soft-delete
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existe = await prisma.produtoCredito.findFirst({
    where: { id, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!existe) return Response.json({ error: "Produto não encontrado" }, { status: 404 });

  await prisma.produtoCredito.update({
    where: { id },
    data: { ativo: false },
  });

  return Response.json({ ok: true });
}
