import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const ativos = await prisma.ativoImobilizado.findMany({
      where: { empresaId: sessao.empresaId },
      orderBy: { createdAt: "desc" },
    });
    // Calcular depreciação acumulada para cada ativo
    const hoje = new Date();
    const resultado = ativos.map(a => {
      const mesesUso = Math.max(0, (hoje.getFullYear() - new Date(a.dataAquisicao).getFullYear()) * 12 + (hoje.getMonth() - new Date(a.dataAquisicao).getMonth()));
      const depreciacaoMensal = (a.valorAquisicao * (a.taxaDepreciacao / 100)) / 12;
      const depreciacaoAcumulada = Math.min(a.valorAquisicao, depreciacaoMensal * mesesUso);
      const valorResidual = Math.max(0, a.valorAquisicao - depreciacaoAcumulada);
      return { ...a, mesesUso, depreciacaoAcumulada: Math.round(depreciacaoAcumulada * 100) / 100, valorResidual: Math.round(valorResidual * 100) / 100 };
    });
    return NextResponse.json(resultado);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar ativos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = await req.json();
    const { nome, categoria, numeroPatrimonio, numeroSerie, marca, modelo, dataAquisicao, valorAquisicao, vidaUtilMeses, taxaDepreciacao, responsavelEmail, responsavelNome, localizacao, observacoes } = body;
    if (!nome || !categoria || !dataAquisicao || !valorAquisicao) return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
    const ativo = await prisma.ativoImobilizado.create({
      data: {
        empresaId: sessao.empresaId, nome, categoria, numeroPatrimonio, numeroSerie, marca, modelo,
        dataAquisicao: new Date(dataAquisicao), valorAquisicao: parseFloat(valorAquisicao),
        vidaUtilMeses: vidaUtilMeses || 60, taxaDepreciacao: taxaDepreciacao || 20,
        responsavelEmail, responsavelNome, localizacao, observacoes,
      },
    });
    return NextResponse.json(ativo, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Erro ao criar ativo" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    const body = await req.json();
    const { id, ...dados } = body;
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    if (dados.dataAquisicao) dados.dataAquisicao = new Date(dados.dataAquisicao);
    if (dados.dataBaixa) dados.dataBaixa = new Date(dados.dataBaixa);
    const ativo = await prisma.ativoImobilizado.update({ where: { id }, data: dados });
    return NextResponse.json(ativo);
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
    await prisma.ativoImobilizado.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir" }, { status: 500 });
  }
}
