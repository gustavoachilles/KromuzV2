import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const docs = await prisma.documentoRegulatorio.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: { dataVencimento: "asc" },
    });

    // Atualizar status de vencidos automaticamente
    const hoje = new Date();
    const atualizados = docs.map(d => {
      if (d.dataVencimento && new Date(d.dataVencimento) < hoje && d.status === "VIGENTE") {
        return { ...d, status: "VENCIDO" };
      }
      return d;
    });

    return NextResponse.json(atualizados);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar documentos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { tipo, nome, orgaoEmissor, numero, dataEmissao, dataVencimento, status, arquivoUrl, observacoes } = body;
    if (!tipo || !nome) return NextResponse.json({ error: "Tipo e nome obrigatórios" }, { status: 400 });

    const doc = await prisma.documentoRegulatorio.create({
      data: {
        empresaId: sessao.empresaId, tipo, nome, orgaoEmissor, numero,
        dataEmissao: dataEmissao ? new Date(dataEmissao) : null,
        dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
        status: status || "VIGENTE", arquivoUrl, observacoes,
      },
    });
    return NextResponse.json(doc, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar documento" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = await req.json();
    const { id, ...dados } = body;
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    if (dados.dataEmissao) dados.dataEmissao = new Date(dados.dataEmissao);
    if (dados.dataVencimento) dados.dataVencimento = new Date(dados.dataVencimento);
    const doc = await prisma.documentoRegulatorio.update({ where: { id }, data: dados });
    return NextResponse.json(doc);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    await prisma.documentoRegulatorio.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
