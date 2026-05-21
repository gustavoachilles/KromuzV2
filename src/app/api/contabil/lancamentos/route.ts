import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/audit";
import { isRateLimited, getClientIP } from "@/lib/rate-limit";
import { sanitizar } from "@/lib/validations";

// GET — Lista lançamentos financeiros com filtros
export async function GET(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const ip = getClientIP(req);
    if (isRateLimited(`${ip}:lancamentos:GET`, 60)) {
      return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");             // RECEITA, DESPESA, IMPOSTO
    const status = searchParams.get("status");         // PENDENTE, PAGO, VENCIDO
    const categoriaId = searchParams.get("categoriaId");
    const mes = searchParams.get("mes");               // 1-12
    const ano = searchParams.get("ano");               // 2026
    const limit = parseInt(searchParams.get("limit") || "200");

    const where: any = { empresaId: sessao.empresaId };
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;
    if (categoriaId) where.categoriaId = categoriaId;
    if (mes && ano) {
      const mesNum = parseInt(mes);
      const anoNum = parseInt(ano);
      const inicio = new Date(anoNum, mesNum - 1, 1);
      const fim = new Date(anoNum, mesNum, 0); // Último dia do mês
      where.dataCompetencia = { gte: inicio, lte: fim };
    } else if (ano) {
      const anoNum = parseInt(ano);
      where.dataCompetencia = {
        gte: new Date(anoNum, 0, 1),
        lte: new Date(anoNum, 11, 31),
      };
    }

    const lancamentos = await prisma.lancamentoFinanceiro.findMany({
      where,
      include: {
        categoria: { select: { id: true, nome: true, tipo: true, grupo: true, icone: true, cor: true } },
        contaBancaria: { select: { id: true, nomeBanco: true, cor: true } },
      },
      orderBy: { dataVencimento: "asc" },
      take: limit,
    });

    return NextResponse.json(lancamentos);
  } catch {
    return NextResponse.json({ error: "Erro ao buscar lançamentos" }, { status: 500 });
  }
}

// POST — Cria um novo lançamento financeiro (com suporte a parcelamento)
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const {
      categoriaId, contaBancariaId, tipo, natureza, descricao,
      valor, dataCompetencia, dataVencimento, dataPagamento,
      status, formaPagamento, observacoes, tags,
      totalParcelas // Se > 1, gera parcelamento automático
    } = body;

    if (!categoriaId || !tipo || !descricao || !valor || !dataCompetencia || !dataVencimento) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    const descricaoSafe = sanitizar(descricao, 300);
    const observacoesSafe = sanitizar(observacoes, 1000);

    // Se parcelado, criar múltiplos lançamentos
    const parcelas = totalParcelas && totalParcelas > 1 ? totalParcelas : 1;
    const parcelamentoRef = parcelas > 1 ? crypto.randomUUID() : null;
    const valorParcela = Math.round((valor / parcelas) * 100) / 100;
    const criados = [];

    for (let i = 0; i < parcelas; i++) {
      const dataVenc = new Date(dataVencimento);
      dataVenc.setMonth(dataVenc.getMonth() + i);

      const dataComp = new Date(dataCompetencia);
      dataComp.setMonth(dataComp.getMonth() + i);

      const lancamento = await prisma.lancamentoFinanceiro.create({
        data: {
          empresaId: sessao.empresaId,
          categoriaId,
          contaBancariaId: contaBancariaId || null,
          tipo,
          natureza: parcelas > 1 ? "PARCELADO" : (natureza || "AVULSO"),
          descricao: parcelas > 1 ? `${descricaoSafe} (${i + 1}/${parcelas})` : descricaoSafe,
          valor: valorParcela,
          dataCompetencia: dataComp,
          dataVencimento: dataVenc,
          dataPagamento: i === 0 && dataPagamento ? new Date(dataPagamento) : null,
          status: i === 0 && dataPagamento ? "PAGO" : (status || "PENDENTE"),
          formaPagamento: formaPagamento || null,
          observacoes: observacoesSafe || null,
          tags: tags || [],
          parcela: parcelas > 1 ? i + 1 : null,
          totalParcelas: parcelas > 1 ? parcelas : null,
          parcelamentoRef,
          criadoPor: sessao.email,
        },
        include: {
          categoria: { select: { id: true, nome: true, tipo: true, grupo: true } },
        },
      });
      criados.push(lancamento);
    }

    return NextResponse.json(
      criados.length === 1 ? criados[0] : { parcelas: criados.length, lancamentos: criados },
      { status: 201 }
    );
  } catch (e) {
    console.error("Erro ao criar lançamento:", e);
    return NextResponse.json({ error: "Erro ao criar lançamento" }, { status: 500 });
  }
}

// PUT — Atualiza um lançamento existente (ex: marcar como PAGO)
export async function PUT(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { id, ...dados } = body;
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const existing = await prisma.lancamentoFinanceiro.findFirst({ where: { id, empresaId: sessao.empresaId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    // Se marcando como pago e não informou dataPagamento, usa hoje
    if (dados.status === "PAGO" && !dados.dataPagamento) {
      dados.dataPagamento = new Date();
    }
    if (dados.status === "PAGO" && !dados.valorPago) {
      dados.valorPago = existing.valor;
    }

    const lancamento = await prisma.lancamentoFinanceiro.update({
      where: { id },
      data: dados,
      include: {
        categoria: { select: { id: true, nome: true, tipo: true, grupo: true } },
        contaBancaria: { select: { id: true, nomeBanco: true } },
      },
    });

    registrarAuditoria({
      empresaId: sessao.empresaId, usuarioEmail: sessao.email,
      acao: "EDITAR", entidade: "LANCAMENTO", entidadeId: id,
      entidadeNome: existing.descricao,
      detalhes: { alteracoes: dados },
    });

    return NextResponse.json(lancamento);
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar lançamento" }, { status: 500 });
  }
}

// DELETE — Exclui um lançamento
export async function DELETE(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const existing = await prisma.lancamentoFinanceiro.findFirst({ where: { id, empresaId: sessao.empresaId } });
    if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

    await prisma.lancamentoFinanceiro.delete({ where: { id } });

    registrarAuditoria({
      empresaId: sessao.empresaId, usuarioEmail: sessao.email,
      acao: "EXCLUIR", entidade: "LANCAMENTO", entidadeId: id,
      entidadeNome: existing.descricao,
      detalhes: { valor: existing.valor, tipo: existing.tipo },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir lançamento" }, { status: 500 });
  }
}
