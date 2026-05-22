import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const campanha = await prisma.campanha.findFirst({
      where: { id: params.id, empresaId: sessao.empresaId },
      include: {
        leads: {
          include: { lead: { select: { nome: true, telefone: true } } },
          orderBy: { updatedAt: "desc" }
        }
      }
    });

    if (!campanha) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

    const total = campanha.leads.length;
    const pendentes = campanha.leads.filter(l => l.statusEnvio === "PENDENTE").length;
    const enviados = campanha.leads.filter(l => l.statusEnvio === "ENVIADO").length;
    const falhas = campanha.leads.filter(l => l.statusEnvio === "FALHOU").length;

    return NextResponse.json({
      ...campanha,
      estatisticas: {
        total,
        pendentes,
        enviados,
        falhas,
        progresso: total > 0 ? Math.round((enviados + falhas) / total * 100) : 0
      }
    });
  } catch (e) {
    console.error("[CAMPANHA_ID_GET]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { status } = await req.json();

    const campanha = await prisma.campanha.updateMany({
      where: { id: params.id, empresaId: sessao.empresaId },
      data: { status }
    });

    if (campanha.count === 0) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const result = await prisma.campanha.deleteMany({
      where: { id: params.id, empresaId: sessao.empresaId }
    });

    if (result.count === 0) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
