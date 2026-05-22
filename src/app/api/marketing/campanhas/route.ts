import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const campanhas = await prisma.campanha.findMany({
      where: { empresaId: sessao.empresaId },
      include: {
        _count: { select: { leads: true } },
        leads: {
          select: { statusEnvio: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Calcular estatísticas básicas
    const campanhasFormatadas = campanhas.map(camp => {
      const total = camp.leads.length;
      const enviados = camp.leads.filter(l => l.statusEnvio === "ENVIADO").length;
      const falhas = camp.leads.filter(l => l.statusEnvio === "FALHOU").length;
      
      return {
        id: camp.id,
        nome: camp.nome,
        status: camp.status,
        dataAgendamento: camp.dataAgendamento,
        createdAt: camp.createdAt,
        totalLeads: total,
        enviados,
        falhas,
        progresso: total > 0 ? Math.round((enviados + falhas) / total * 100) : 0
      };
    });

    return NextResponse.json(campanhasFormatadas);
  } catch (e) {
    console.error("[CAMPANHAS_GET]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { nome, conteudoMensagem, filtros } = await req.json();

    if (!nome || !conteudoMensagem) {
      return NextResponse.json({ error: "Nome e mensagem são obrigatórios" }, { status: 400 });
    }

    // 1. Filtrar os Leads
    const whereClause: any = { empresaId: sessao.empresaId };
    
    if (filtros.status) {
      whereClause.status = filtros.status;
    }
    
    if (filtros.origem) {
      whereClause.origem = filtros.origem;
    }

    // Buscar os leads que batem com o filtro
    const leadsTarget = await prisma.lead.findMany({
      where: whereClause,
      select: { id: true, telefone: true }
    });

    const leadsComTelefoneValido = leadsTarget.filter(l => !!l.telefone);

    if (leadsComTelefoneValido.length === 0) {
      return NextResponse.json({ error: "Nenhum lead encontrado com esse filtro (ou sem telefone)" }, { status: 400 });
    }

    // 2. Criar a Campanha e atrelar os Leads
    const campanha = await prisma.campanha.create({
      data: {
        empresaId: sessao.empresaId,
        nome,
        conteudoMensagem,
        status: "RODANDO", // Inicia automaticamente
        dataAgendamento: new Date(),
        leads: {
          create: leadsComTelefoneValido.map(lead => ({
            leadId: lead.id,
            statusEnvio: "PENDENTE"
          }))
        }
      }
    });

    return NextResponse.json({ 
      id: campanha.id, 
      totalAlvo: leadsComTelefoneValido.length 
    }, { status: 201 });

  } catch (e) {
    console.error("[CAMPANHAS_POST]", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
