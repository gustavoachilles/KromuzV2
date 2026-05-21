import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const certs = await prisma.certificacaoVendedor.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: { dataVencimento: "asc" },
    });
    const hoje = new Date();
    const atualizados = certs.map(c => {
      if (new Date(c.dataVencimento) < hoje && c.status === "VIGENTE") return { ...c, status: "VENCIDO" };
      return c;
    });
    return NextResponse.json(atualizados);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar certificações" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = await req.json();
    const { vendedorEmail, vendedorNome, tipoCertificacao, numero, instituicao, dataEmissao, dataVencimento, arquivoUrl, observacoes } = body;
    if (!vendedorEmail || !tipoCertificacao || !dataVencimento) return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
    const cert = await prisma.certificacaoVendedor.create({
      data: {
        empresaId: sessao.empresaId, vendedorEmail, vendedorNome, tipoCertificacao, numero, instituicao,
        dataEmissao: dataEmissao ? new Date(dataEmissao) : null,
        dataVencimento: new Date(dataVencimento),
        arquivoUrl, observacoes,
      },
    });
    return NextResponse.json(cert, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar certificação" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = await req.json();
    const { id, ...dados } = body;
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    const existing = await prisma.certificacaoVendedor.findFirst({ where: { id, empresaId: sessao.empresaId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    if (dados.dataEmissao) dados.dataEmissao = new Date(dados.dataEmissao);
    if (dados.dataVencimento) dados.dataVencimento = new Date(dados.dataVencimento);
    const cert = await prisma.certificacaoVendedor.update({ where: { id }, data: dados });
    return NextResponse.json(cert);
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
    const existing = await prisma.certificacaoVendedor.findFirst({ where: { id, empresaId: sessao.empresaId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    await prisma.certificacaoVendedor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
