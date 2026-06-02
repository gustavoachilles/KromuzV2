import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const promotoras = await prisma.promotora.findMany({
    where: { empresaId: sessao.empresaId },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(promotoras);
}

const PromotoraSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2),
  cnpj: z.string().optional().nullable(),
  ativo: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = PromotoraSchema.parse(await req.json());

    const promotora = await prisma.promotora.create({
      data: {
        empresaId: sessao.empresaId,
        nome: body.nome,
        cnpj: body.cnpj,
        ativo: body.ativo,
      },
    });

    return NextResponse.json(promotora, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = PromotoraSchema.parse(await req.json());
    if (!body.id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const existe = await prisma.promotora.findFirst({
      where: { id: body.id, empresaId: sessao.empresaId },
    });
    if (!existe) return NextResponse.json({ error: "Promotora não encontrada" }, { status: 404 });

    const atualizada = await prisma.promotora.update({
      where: { id: body.id },
      data: {
        nome: body.nome,
        cnpj: body.cnpj,
        ativo: body.ativo,
      },
    });

    return NextResponse.json(atualizada);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const existe = await prisma.promotora.findFirst({
    where: { id, empresaId: sessao.empresaId },
  });
  if (!existe) return NextResponse.json({ error: "Promotora não encontrada" }, { status: 404 });

  await prisma.promotora.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
