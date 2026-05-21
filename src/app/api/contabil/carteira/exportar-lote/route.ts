import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/audit";
import { isRateLimited, getClientIP } from "@/lib/rate-limit";

// POST — Gera um lote de pagamentos PIX (remessa consolidada)
// Marca todas as transações pendentes como LIQUIDADO e retorna CSV/JSON para pagar
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    // Rate limit rigoroso — exportar PIX é operação crítica
    const ip = getClientIP(req);
    if (isRateLimited(`${ip}:exportar-pix`, 3, 60_000)) {
      return NextResponse.json({ error: "Muitas exportações. Aguarde 1 minuto." }, { status: 429 });
    }

    const body = await req.json();
    const { vendedoresEmails } = body; // Array opcional de emails para filtrar

    // Buscar todas as transações de crédito pendentes
    const where: any = {
      empresaId: sessao.empresaId,
      tipo: "CREDITO",
      statusPagamento: "PENDENTE",
    };
    if (vendedoresEmails && vendedoresEmails.length > 0) {
      where.vendedorEmail = { in: vendedoresEmails };
    }

    const pendentes = await prisma.transacaoCarteira.findMany({ where });

    // Calcular débitos pendentes também para abater
    const debitos = await prisma.transacaoCarteira.findMany({
      where: {
        empresaId: sessao.empresaId,
        tipo: "DEBITO",
        vendedorEmail: { in: [...new Set(pendentes.map(p => p.vendedorEmail))] },
      },
      select: { vendedorEmail: true, valor: true },
    });

    // Agrupar débitos por vendedor
    const debitoMap: Record<string, number> = {};
    debitos.forEach(d => {
      debitoMap[d.vendedorEmail] = (debitoMap[d.vendedorEmail] || 0) + d.valor;
    });

    // Agrupar créditos por vendedor
    const loteMap: Record<string, { nome: string; totalCreditos: number; totalDebitos: number; liquido: number; transacaoIds: string[] }> = {};
    pendentes.forEach(t => {
      if (!loteMap[t.vendedorEmail]) {
        loteMap[t.vendedorEmail] = {
          nome: t.vendedorNome || t.vendedorEmail,
          totalCreditos: 0,
          totalDebitos: debitoMap[t.vendedorEmail] || 0,
          liquido: 0,
          transacaoIds: [],
        };
      }
      loteMap[t.vendedorEmail].totalCreditos += t.valor;
      loteMap[t.vendedorEmail].transacaoIds.push(t.id);
    });

    // Calcular líquido
    Object.values(loteMap).forEach(v => {
      v.liquido = v.totalCreditos - v.totalDebitos;
    });

    // Buscar dados bancários dos vendedores
    const emails = Object.keys(loteMap);
    const perfis = await prisma.usuarioPerfil.findMany({
      where: { empresaId: sessao.empresaId, email: { in: emails } },
      select: {
        email: true, nome: true, chavePix: true, tipoChavePix: true,
        bancoNome: true, bancoAgencia: true, bancoConta: true, bancoTipoConta: true, cpf: true,
      },
    });
    const perfilMap = Object.fromEntries(perfis.map(p => [p.email, p]));

    // Montar remessa
    const remessa = emails
      .filter(email => loteMap[email].liquido > 0)
      .map(email => {
        const v = loteMap[email];
        const p = perfilMap[email];
        return {
          vendedorEmail: email,
          vendedorNome: v.nome,
          cpf: p?.cpf || "",
          chavePix: p?.chavePix || "",
          tipoChavePix: p?.tipoChavePix || "",
          banco: p?.bancoNome || "",
          agencia: p?.bancoAgencia || "",
          conta: p?.bancoConta || "",
          tipoConta: p?.bancoTipoConta || "",
          valorBruto: v.totalCreditos,
          descontos: v.totalDebitos,
          valorLiquido: v.liquido,
          transacaoIds: v.transacaoIds,
        };
      });

    // Marcar transações como LIQUIDADO
    const allIds = remessa.flatMap(r => r.transacaoIds);
    if (allIds.length > 0) {
      await prisma.transacaoCarteira.updateMany({
        where: { id: { in: allIds } },
        data: { statusPagamento: "LIQUIDADO", dataPagamento: new Date() },
      });
    }

    // Gerar CSV
    const csvHeader = "Nome;CPF;Chave PIX;Tipo Chave;Banco;Agência;Conta;Valor Líquido";
    const csvRows = remessa.map(r =>
      `${r.vendedorNome};${r.cpf};${r.chavePix};${r.tipoChavePix};${r.banco};${r.agencia};${r.conta};${r.valorLiquido.toFixed(2)}`
    );
    const csv = [csvHeader, ...csvRows].join("\n");

    registrarAuditoria({
      empresaId: sessao.empresaId, usuarioEmail: sessao.email,
      acao: "EXPORTAR", entidade: "CARTEIRA",
      entidadeNome: `Lote PIX - ${remessa.length} vendedores`,
      detalhes: {
        totalVendedores: remessa.length,
        valorTotal: remessa.reduce((s, r) => s + r.valorLiquido, 0),
        transacoesLiquidadas: allIds.length,
      },
    });

    return NextResponse.json({
      totalVendedores: remessa.length,
      valorTotal: remessa.reduce((s, r) => s + r.valorLiquido, 0),
      transacoesLiquidadas: allIds.length,
      remessa,
      csv,
    });
  } catch (e) {
    console.error("Erro ao exportar lote:", e);
    return NextResponse.json({ error: "Erro ao gerar lote de pagamentos" }, { status: 500 });
  }
}
