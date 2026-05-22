import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";

// GET /api/atividades?mes=2026-05&responsavel=uuid
export async function GET(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const mes = req.nextUrl.searchParams.get("mes"); // "2026-05"
    const responsavel = req.nextUrl.searchParams.get("responsavel");
    const status = req.nextUrl.searchParams.get("status");

    // Calcular range do mês (ou padrão: mês atual ± 7 dias)
    let inicio: Date, fim: Date;
    if (mes) {
      const [y, m] = mes.split("-").map(Number);
      inicio = new Date(y, m - 1, 1);
      fim = new Date(y, m, 0, 23, 59, 59);
    } else {
      inicio = new Date();
      inicio.setDate(1);
      fim = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0, 23, 59, 59);
    }

    const atividades = await prisma.atividade.findMany({
      where: {
        empresaId: sessao.empresaId,
        dataInicio: { gte: inicio, lte: fim },
        ...(responsavel ? { responsavelId: responsavel } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { dataInicio: "asc" },
      take: 500,
    });

    // Métricas
    const total = atividades.length;
    const pendentes = atividades.filter(a => a.status === "PENDENTE").length;
    const concluidas = atividades.filter(a => a.status === "CONCLUIDA").length;
    const atrasadas = atividades.filter(a => a.status === "PENDENTE" && new Date(a.dataInicio) < new Date()).length;

    return NextResponse.json({ atividades, metricas: { total, pendentes, concluidas, atrasadas } });
  } catch (e) {
    console.error("[ATIVIDADES_GET]", e);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST /api/atividades — criar nova atividade
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { titulo, descricao, tipo, dataInicio, dataFim, diaInteiro, prioridade, cor, leadId, leadNome, responsavelId, responsavelNome, lembrete } = body;

    if (!titulo || !dataInicio) {
      return NextResponse.json({ error: "Título e data são obrigatórios" }, { status: 400 });
    }

    const atividade = await prisma.atividade.create({
      data: {
        empresaId: sessao.empresaId,
        titulo: titulo.substring(0, 200),
        descricao: descricao?.substring(0, 1000),
        tipo: tipo || "TAREFA",
        dataInicio: new Date(dataInicio),
        dataFim: dataFim ? new Date(dataFim) : null,
        diaInteiro: diaInteiro || false,
        prioridade: prioridade || "MEDIA",
        cor: cor || "#6366f1",
        leadId,
        leadNome: leadNome?.substring(0, 200),
        responsavelId: responsavelId || sessao.userId,
        responsavelNome: responsavelNome || sessao.email,
        lembrete: lembrete ? Number(lembrete) : null,
      },
    });

    return NextResponse.json(atividade, { status: 201 });
  } catch (e) {
    console.error("[ATIVIDADES_POST]", e);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// PUT /api/atividades — atualizar atividade
export async function PUT(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { id, ...dados } = body;

    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    // Verificar pertence à empresa
    const existe = await prisma.atividade.findFirst({ where: { id, empresaId: sessao.empresaId } });
    if (!existe) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

    // Sanitizar
    const updateData: any = {};
    if (dados.titulo) updateData.titulo = dados.titulo.substring(0, 200);
    if (dados.descricao !== undefined) updateData.descricao = dados.descricao?.substring(0, 1000);
    if (dados.tipo) updateData.tipo = dados.tipo;
    if (dados.dataInicio) updateData.dataInicio = new Date(dados.dataInicio);
    if (dados.dataFim !== undefined) updateData.dataFim = dados.dataFim ? new Date(dados.dataFim) : null;
    if (dados.diaInteiro !== undefined) updateData.diaInteiro = dados.diaInteiro;
    if (dados.prioridade) updateData.prioridade = dados.prioridade;
    if (dados.cor) updateData.cor = dados.cor;
    if (dados.leadId !== undefined) updateData.leadId = dados.leadId;
    if (dados.leadNome !== undefined) updateData.leadNome = dados.leadNome;
    if (dados.responsavelId !== undefined) updateData.responsavelId = dados.responsavelId;
    if (dados.responsavelNome !== undefined) updateData.responsavelNome = dados.responsavelNome;
    if (dados.lembrete !== undefined) updateData.lembrete = dados.lembrete ? Number(dados.lembrete) : null;

    if (dados.status === "CONCLUIDA") {
      updateData.status = "CONCLUIDA";
      updateData.concluidaEm = new Date();
    } else if (dados.status) {
      updateData.status = dados.status;
      if (dados.status !== "CONCLUIDA") updateData.concluidaEm = null;
    }

    const updated = await prisma.atividade.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[ATIVIDADES_PUT]", e);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// DELETE /api/atividades?id=uuid
export async function DELETE(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const existe = await prisma.atividade.findFirst({ where: { id, empresaId: sessao.empresaId } });
    if (!existe) return NextResponse.json({ error: "Atividade não encontrada" }, { status: 404 });

    await prisma.atividade.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ATIVIDADES_DELETE]", e);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
