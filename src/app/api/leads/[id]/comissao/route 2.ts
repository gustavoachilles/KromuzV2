import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });
    const { id } = await params;

    const lead = await prisma.lead.findFirst({
      where: { id, empresaId: sessao.empresaId },
    });

    if (!lead) return Response.json({ error: "Lead não encontrado" }, { status: 404 });

    // Encontrar uma tabela aplicável para calcular a comissão
    // Procuramos uma tabela do banco preferido e do tipo de operação
    let tabela = await prisma.tabelaCoeficiente.findFirst({
      where: {
        empresaId: sessao.empresaId,
        ativo: true,
        banco: lead.bancoPreferido ? { nome: { contains: lead.bancoPreferido, mode: 'insensitive' } } : undefined,
      },
      orderBy: { comissaoFlatPct: 'desc' }, // Pegamos a melhor tabela para a loja
    });

    // Fallback: se não achar pelo banco, pega a maior tabela ativa geral
    if (!tabela) {
      tabela = await prisma.tabelaCoeficiente.findFirst({
        where: { empresaId: sessao.empresaId, ativo: true, comissaoFlatPct: { not: null } },
        orderBy: { comissaoFlatPct: 'desc' },
      });
    }

    const pctFlat = tabela?.comissaoFlatPct || 0;
    const valorLiberado = lead.valorLiberado || 0;
    const valorComissao = (valorLiberado * pctFlat) / 100;

    // Converte Lead em Proposta Paga
    const proposta = await prisma.proposta.create({
      data: {
        empresaId: sessao.empresaId,
        clienteNome: lead.nome,
        clienteCpf: lead.cpf,
        clienteTelefone: lead.telefone,
        tipoOperacao: lead.tipoOperacao || "EMPRESTIMO_CONSIGNADO",
        status: "PAGA",
        bancoNome: lead.bancoPreferido || tabela?.nome || "Banco Desconhecido",
        valorLiberado: valorLiberado,
        valorComissao: valorComissao,
        vendedorNome: lead.vendedorNome,
        vendedorEmail: lead.vendedorEmail,
        pagaEm: new Date(),
      }
    });

    return Response.json({ 
      sucesso: true, 
      propostaId: proposta.id, 
      comissao: valorComissao,
      tabelaUsada: tabela?.nome 
    });

  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
