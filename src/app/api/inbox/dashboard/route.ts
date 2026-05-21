import { NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const [todas, abertas, fechadas, aguardando] = await Promise.all([
      prisma.conversa.count({ where: { empresaId: sessao.empresaId } }),
      prisma.conversa.count({ where: { empresaId: sessao.empresaId, status: "ABERTO" } }),
      prisma.conversa.count({ where: { empresaId: sessao.empresaId, status: "FECHADO" } }),
      prisma.conversa.count({ where: { empresaId: sessao.empresaId, status: "AGUARDANDO_IA" } }),
    ]);

    // Tempo médio de resposta (conversas com tempoResposta)
    const tempoMedio = await prisma.conversa.aggregate({
      where: { empresaId: sessao.empresaId, tempoResposta: { not: null } },
      _avg: { tempoResposta: true },
    });

    // Por canal
    const porCanal = await prisma.conversa.groupBy({
      by: ["canalId"],
      where: { empresaId: sessao.empresaId },
      _count: true,
    });
    const canais = await prisma.canalComunicacao.findMany({
      where: { empresaId: sessao.empresaId },
      select: { id: true, tipo: true, nomeCanal: true },
    });
    const conversasPorCanal = porCanal.map(p => ({
      canal: canais.find(c => c.id === p.canalId)?.nomeCanal || "Desconhecido",
      tipo: canais.find(c => c.id === p.canalId)?.tipo || "OUTRO",
      total: p._count,
    }));

    // Por atendente (top 10)
    const porAtendente = await prisma.conversa.groupBy({
      by: ["vendedorId"],
      where: { empresaId: sessao.empresaId, vendedorId: { not: null } },
      _count: true,
      orderBy: { _count: { vendedorId: "desc" } },
      take: 10,
    });
    const vendedorIds = porAtendente.map(p => p.vendedorId!).filter(Boolean);
    const vendedores = vendedorIds.length > 0 ? await prisma.usuarioPerfil.findMany({
      where: { id: { in: vendedorIds } },
      select: { id: true, nomeCompleto: true, email: true },
    }) : [];
    const conversasPorAtendente = porAtendente.map(p => ({
      nome: vendedores.find(v => v.id === p.vendedorId)?.nomeCompleto || "N/A",
      email: vendedores.find(v => v.id === p.vendedorId)?.email || "",
      total: p._count,
    }));

    // Conversas hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const conversasHoje = await prisma.conversa.count({
      where: { empresaId: sessao.empresaId, createdAt: { gte: hoje } },
    });

    const taxaResolucao = todas > 0 ? Math.round((fechadas / todas) * 100) : 0;

    return NextResponse.json({
      total: todas,
      abertas,
      fechadas,
      aguardando,
      conversasHoje,
      tempoMedioResposta: Math.round(tempoMedio._avg.tempoResposta || 0),
      taxaResolucao,
      conversasPorCanal,
      conversasPorAtendente,
    });
  } catch (e) {
    console.error("Erro dashboard inbox:", e);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
