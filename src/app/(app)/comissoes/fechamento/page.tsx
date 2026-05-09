import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FechamentoClient } from "./FechamentoClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Fechamento de Comissões | Kromuz",
  description: "Fechamento de folha de pagamento e comissões da equipe.",
};

export default async function FechamentoPage({ searchParams }: { searchParams: Promise<{ mes?: string, ano?: string }> }) {
  const sessao = await getSessionEmpresa();
  const eid = sessao.empresaId;
  const hoje = new Date();
  
  const params = await searchParams;
  const mes = params?.mes ? parseInt(params.mes) : hoje.getMonth() + 1;
  const ano = params?.ano ? parseInt(params.ano) : hoje.getFullYear();

  // Buscar equipe e suas regras de remuneração
  const equipe = await prisma.usuarioPerfil.findMany({
    where: { empresaId: eid, ativo: true },
    select: {
      email: true,
      nome: true,
      perfilSlug: true,
      tipoRemuneracao: true,
      percentualFixo: true,
      salarioFixo: true
    }
  });

  // Buscar todas as propostas pagas do mês selecionado
  const propostasPagas = await prisma.proposta.findMany({
    where: {
      empresaId: eid,
      status: "PAGA",
      pagaEm: {
        gte: new Date(ano, mes - 1, 1),
        lt: new Date(ano, mes, 1) // 1º dia do mês seguinte
      }
    },
    select: {
      vendedorEmail: true,
      vendedorNome: true,
      valorLiberado: true,
      valorComissao: true // Comissão flat recebida pela corretora
    }
  });

  // Agrupar propostas por vendedor
  const producaoPorVendedor: Record<string, { propostasCount: number, volumeTotal: number, comissaoCorretora: number }> = {};
  
  propostasPagas.forEach(p => {
    if (!p.vendedorEmail) return;
    const v = p.vendedorEmail;
    if (!producaoPorVendedor[v]) {
      producaoPorVendedor[v] = { propostasCount: 0, volumeTotal: 0, comissaoCorretora: 0 };
    }
    producaoPorVendedor[v].propostasCount += 1;
    producaoPorVendedor[v].volumeTotal += p.valorLiberado || 0;
    producaoPorVendedor[v].comissaoCorretora += p.valorComissao || 0;
  });

  // Calcular Holerites
  const holerites = equipe.map(membro => {
    const prod = producaoPorVendedor[membro.email] || { propostasCount: 0, volumeTotal: 0, comissaoCorretora: 0 };
    
    let comissaoVendedor = 0;
    const salarioFixo = membro.salarioFixo || 0;

    // Regra de Remuneração
    if (membro.tipoRemuneracao === "PERCENTUAL_FIXO") {
      // Ex: Ganha 0.5% sobre o Volume Total
      if (membro.percentualFixo) {
        comissaoVendedor = prod.volumeTotal * (membro.percentualFixo / 100);
      }
    } 
    // Faixas_Meta seria implementado com regras JSON. Para versão 1.0, vamos usar flat.
    
    const valorTotalReceber = salarioFixo + comissaoVendedor;

    return {
      vendedor: membro,
      producao: prod,
      holerite: {
        salarioFixo,
        comissaoVendedor,
        valorTotalReceber
      }
    };
  });

  return (
    <FechamentoClient 
      mes={mes} 
      ano={ano} 
      holerites={holerites} 
      isAdmin={sessao.perfilSlug === "admin"}
    />
  );
}
