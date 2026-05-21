import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/audit";

// POST — Recebe extrato bancário (linhas parseadas) e cruza com lançamentos
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { contaBancariaId, linhas } = body;

    if (!contaBancariaId || !linhas || !Array.isArray(linhas) || linhas.length === 0) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Verificar conta bancária pertence à empresa
    const conta = await prisma.contaBancariaCF.findFirst({ where: { id: contaBancariaId, empresaId: sessao.empresaId } });
    if (!conta) return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 });

    // Buscar lançamentos do período para matching
    const datas = linhas.map((l: any) => new Date(l.data)).filter((d: Date) => !isNaN(d.getTime()));
    const minDate = new Date(Math.min(...datas.map((d: Date) => d.getTime())));
    const maxDate = new Date(Math.max(...datas.map((d: Date) => d.getTime())));
    minDate.setDate(minDate.getDate() - 5); // Margem de 5 dias
    maxDate.setDate(maxDate.getDate() + 5);

    const lancamentos = await prisma.lancamentoFinanceiro.findMany({
      where: {
        empresaId: sessao.empresaId,
        contaBancariaId,
        dataVencimento: { gte: minDate, lte: maxDate },
      },
      include: { categoria: { select: { nome: true } } },
    });

    // Match: extrato vs lançamentos
    let conciliados = 0;
    let pendentes = 0;
    let divergentes = 0;
    const resultado = [];

    for (const linha of linhas) {
      const valorExtrato = parseFloat(linha.valor) || 0;
      const descExtrato = (linha.descricao || "").toLowerCase();
      const dataExtrato = new Date(linha.data);

      // Buscar match por valor + data próxima
      let match = null;
      let statusConciliacao = "PENDENTE";
      let divergencia = null;

      for (const lanc of lancamentos) {
        const diffDias = Math.abs((lanc.dataVencimento.getTime() - dataExtrato.getTime()) / (1000 * 60 * 60 * 24));
        const diffValor = Math.abs(lanc.valor - Math.abs(valorExtrato));

        // Match exato: mesmo valor, data dentro de 3 dias
        if (diffValor < 0.01 && diffDias <= 3) {
          match = lanc;
          statusConciliacao = "CONCILIADO";
          conciliados++;
          break;
        }

        // Match parcial: valor parecido (até 5% de diferença), data próxima
        if (diffValor / Math.abs(valorExtrato) < 0.05 && diffDias <= 5) {
          match = lanc;
          statusConciliacao = "DIVERGENTE";
          divergencia = `Valor extrato: R$${Math.abs(valorExtrato).toFixed(2)} vs Sistema: R$${lanc.valor.toFixed(2)}`;
          divergentes++;
          break;
        }
      }

      if (!match) pendentes++;

      resultado.push({
        dataExtrato: linha.data,
        descricaoExtrato: linha.descricao,
        valorExtrato,
        tipo: valorExtrato >= 0 ? "CREDITO" : "DEBITO",
        statusConciliacao,
        divergencia,
        lancamentoId: match?.id || null,
        lancamentoDescricao: match?.descricao || null,
        lancamentoValor: match?.valor || null,
        categoriaNome: match?.categoria?.nome || null,
      });
    }

    registrarAuditoria({
      empresaId: sessao.empresaId, usuarioEmail: sessao.email,
      acao: "CRIAR", entidade: "CONCILIACAO",
      entidadeNome: `${conta.nomeBanco} - ${linhas.length} linhas`,
      detalhes: { conciliados, pendentes, divergentes },
    });

    return NextResponse.json({
      contaBancaria: conta.nomeBanco,
      totalLinhas: linhas.length,
      conciliados,
      divergentes,
      pendentes,
      taxaConciliacao: linhas.length > 0 ? Math.round((conciliados / linhas.length) * 100) : 0,
      resultado,
    });
  } catch (e) {
    console.error("Erro conciliação:", e);
    return NextResponse.json({ error: "Erro na conciliação" }, { status: 500 });
  }
}
