import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/bancos/[id] — detalhe do banco com produtos e tabelas
export async function GET(_req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const banco = await prisma.banco.findFirst({
    where: { id, empresaId: sessao.empresaId },
    include: {
      produtosCredito: {
        where: { ativo: true },
        orderBy: { nomeProduto: "asc" },
      },
      tabelasCoeficiente: {
        where: { ativo: true },
        orderBy: [{ prazo: "asc" }],
        include: {
          produto: { select: { nomeProduto: true, tipoProduto: true } },
        },
      },
      regrasProduto: {
        where: { ativa: true },
        select: { id: true, tipoOperacao: true, produtoNome: true },
      },
    },
  });

  if (!banco) {
    return Response.json({ error: "Banco não encontrado" }, { status: 404 });
  }

  return Response.json(banco);
}

const AtualizarBancoSchema = z.object({
  nome: z.string().min(2).optional(),
  codigoCompe: z.string().nullable().optional(),
  cnpj: z.string().nullable().optional(),
  tipo: z.string().optional(),
  tipoBanco: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  ativo: z.boolean().optional(),
  ativoSimulacao: z.boolean().optional(),
  ordem: z.number().int().optional(),
  fatorSaldo: z.number().nullable().optional(),
  multiplicadorMaxParcela: z.number().nullable().optional(),
  prazoMaximo: z.number().int().nullable().optional(),
  observacoes: z.string().nullable().optional(),
  permiteIntegracao: z.boolean().optional(),
  credenciaisApi: z.any().optional(),
});

// PATCH /api/bancos/[id] — edita banco
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  // Garante que pertence à empresa
  const existe = await prisma.banco.findFirst({
    where: { id, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!existe) return Response.json({ error: "Banco não encontrado" }, { status: 404 });

  try {
    const body = AtualizarBancoSchema.parse(await req.json());

    const banco = await prisma.banco.update({
      where: { id },
      data: body,
    });

    return Response.json(banco);
  } catch (e: any) {
    if (e.code === "P2002") {
      return Response.json({ error: "Já existe um banco com este nome." }, { status: 409 });
    }
    return Response.json({ error: e.message }, { status: 400 });
  }
}

// DELETE /api/bancos/[id] — soft-delete (desativa)
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const { id } = await params;

  const existe = await prisma.banco.findFirst({
    where: { id, empresaId: sessao.empresaId },
    select: { id: true },
  });
  if (!existe) return Response.json({ error: "Banco não encontrado" }, { status: 404 });

  await prisma.banco.update({
    where: { id },
    data: { ativo: false, ativoSimulacao: false },
  });

  return Response.json({ ok: true });
}
