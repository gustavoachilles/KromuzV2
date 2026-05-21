import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * API de Notificações — Verifica vencimentos próximos e gera alertas.
 * Pode ser chamada por cron (Vercel Cron) ou manualmente.
 * 
 * GET /api/contabil/notificacoes — Lista notificações da empresa
 * POST /api/contabil/notificacoes — Gera notificações (scan de vencimentos)
 */

import { getSessionEmpresa } from "@/lib/session";

type Notificacao = {
  tipo: "CRITICA" | "ALERTA" | "INFO";
  modulo: string;
  titulo: string;
  descricao: string;
  vencimento?: string;
  diasRestantes?: number;
};

export async function GET() {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const hoje = new Date();
    const em15dias = new Date(); em15dias.setDate(hoje.getDate() + 15);
    const em30dias = new Date(); em30dias.setDate(hoje.getDate() + 30);
    const em60dias = new Date(); em60dias.setDate(hoje.getDate() + 60);

    const notificacoes: Notificacao[] = [];

    // 1. Documentos regulatórios vencidos ou próximos do vencimento
    const docs = await prisma.documentoRegulatorio.findMany({
      where: { empresaId: sessao.empresaId, dataVencimento: { lte: em60dias } },
      orderBy: { dataVencimento: "asc" },
    });

    for (const doc of docs) {
      if (!doc.dataVencimento) continue;
      const dias = Math.ceil((doc.dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dias < 0) {
        notificacoes.push({
          tipo: "CRITICA", modulo: "DOCUMENTO",
          titulo: `${doc.tipo} VENCIDO`,
          descricao: `"${doc.nome}" venceu há ${Math.abs(dias)} dia(s). Renovação urgente!`,
          vencimento: doc.dataVencimento.toISOString(), diasRestantes: dias,
        });
      } else if (dias <= 15) {
        notificacoes.push({
          tipo: "CRITICA", modulo: "DOCUMENTO",
          titulo: `${doc.tipo} vence em ${dias} dia(s)`,
          descricao: `"${doc.nome}" — prazo crítico para renovação.`,
          vencimento: doc.dataVencimento.toISOString(), diasRestantes: dias,
        });
      } else if (dias <= 30) {
        notificacoes.push({
          tipo: "ALERTA", modulo: "DOCUMENTO",
          titulo: `${doc.tipo} vence em ${dias} dia(s)`,
          descricao: `"${doc.nome}" — agendar renovação.`,
          vencimento: doc.dataVencimento.toISOString(), diasRestantes: dias,
        });
      } else {
        notificacoes.push({
          tipo: "INFO", modulo: "DOCUMENTO",
          titulo: `${doc.tipo} vence em ${dias} dia(s)`,
          descricao: `"${doc.nome}" — atenção preventiva.`,
          vencimento: doc.dataVencimento.toISOString(), diasRestantes: dias,
        });
      }
    }

    // 2. Certificações de vendedores
    const certs = await prisma.certificacaoVendedor.findMany({
      where: { empresaId: sessao.empresaId, dataVencimento: { lte: em60dias } },
      orderBy: { dataVencimento: "asc" },
    });

    for (const cert of certs) {
      const dias = Math.ceil((cert.dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      if (dias < 0) {
        notificacoes.push({
          tipo: "CRITICA", modulo: "CERTIFICACAO",
          titulo: `Certificação ${cert.tipoCertificacao} VENCIDA`,
          descricao: `${cert.vendedorNome || cert.vendedorEmail} — vencida há ${Math.abs(dias)} dia(s). Vendedor IRREGULAR!`,
          vencimento: cert.dataVencimento.toISOString(), diasRestantes: dias,
        });
      } else if (dias <= 30) {
        notificacoes.push({
          tipo: "ALERTA", modulo: "CERTIFICACAO",
          titulo: `Certificação ${cert.tipoCertificacao} vence em ${dias} dia(s)`,
          descricao: `${cert.vendedorNome || cert.vendedorEmail} — providenciar renovação.`,
          vencimento: cert.dataVencimento.toISOString(), diasRestantes: dias,
        });
      }
    }

    // 3. Contas a pagar vencidas
    const contasVencidas = await prisma.lancamentoFinanceiro.findMany({
      where: {
        empresaId: sessao.empresaId,
        tipo: "DESPESA",
        status: "PENDENTE",
        dataVencimento: { lt: hoje },
      },
      select: { id: true, descricao: true, valor: true, dataVencimento: true },
      orderBy: { dataVencimento: "asc" },
      take: 20,
    });

    for (const conta of contasVencidas) {
      const dias = Math.ceil((hoje.getTime() - conta.dataVencimento.getTime()) / (1000 * 60 * 60 * 24));
      notificacoes.push({
        tipo: "CRITICA", modulo: "LANCAMENTO",
        titulo: `Conta vencida há ${dias} dia(s)`,
        descricao: `"${conta.descricao}" — R$${conta.valor.toFixed(2)} não pago.`,
        vencimento: conta.dataVencimento.toISOString(), diasRestantes: -dias,
      });
    }

    // 4. Contas vencendo nos próximos 7 dias
    const em7dias = new Date(); em7dias.setDate(hoje.getDate() + 7);
    const contasProximas = await prisma.lancamentoFinanceiro.findMany({
      where: {
        empresaId: sessao.empresaId,
        tipo: "DESPESA",
        status: "PENDENTE",
        dataVencimento: { gte: hoje, lte: em7dias },
      },
      select: { id: true, descricao: true, valor: true, dataVencimento: true },
      orderBy: { dataVencimento: "asc" },
      take: 20,
    });

    for (const conta of contasProximas) {
      const dias = Math.ceil((conta.dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
      notificacoes.push({
        tipo: "ALERTA", modulo: "LANCAMENTO",
        titulo: `Conta vence em ${dias} dia(s)`,
        descricao: `"${conta.descricao}" — R$${conta.valor.toFixed(2)}.`,
        vencimento: conta.dataVencimento.toISOString(), diasRestantes: dias,
      });
    }

    // 5. Vendedores com saldo negativo
    const transacoes = await prisma.transacaoCarteira.findMany({
      where: { empresaId: sessao.empresaId },
      select: { vendedorEmail: true, vendedorNome: true, tipo: true, valor: true },
    });
    const saldos: Record<string, { nome: string; saldo: number }> = {};
    transacoes.forEach(t => {
      if (!saldos[t.vendedorEmail]) saldos[t.vendedorEmail] = { nome: t.vendedorNome || t.vendedorEmail, saldo: 0 };
      saldos[t.vendedorEmail].saldo += t.tipo === "CREDITO" ? t.valor : -t.valor;
    });
    Object.entries(saldos).forEach(([email, { nome, saldo }]) => {
      if (saldo < 0) {
        notificacoes.push({
          tipo: "ALERTA", modulo: "CARTEIRA",
          titulo: `Saldo negativo: ${nome}`,
          descricao: `${email} tem saldo de R$${saldo.toFixed(2)}. Verificar.`,
        });
      }
    });

    // Ordenar: CRITICA > ALERTA > INFO
    const prioridade = { CRITICA: 0, ALERTA: 1, INFO: 2 };
    notificacoes.sort((a, b) => prioridade[a.tipo] - prioridade[b.tipo]);

    return NextResponse.json({
      total: notificacoes.length,
      criticas: notificacoes.filter(n => n.tipo === "CRITICA").length,
      alertas: notificacoes.filter(n => n.tipo === "ALERTA").length,
      info: notificacoes.filter(n => n.tipo === "INFO").length,
      notificacoes,
    });
  } catch (e) {
    console.error("Erro notificações:", e);
    return NextResponse.json({ error: "Erro ao gerar notificações" }, { status: 500 });
  }
}
