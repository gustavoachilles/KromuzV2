import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

    // Pega o início e fim do mês atual para filtrar propostas
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);

    // 1. Busca todos os usuários da empresa
    const usuarios = await prisma.usuarioPerfil.findMany({
      where: { empresaId: sessao.empresaId, ativo: true },
      orderBy: { nome: 'asc' }
    });

    // 2. Busca todas as propostas PAGAS no mês atual
    const propostas = await prisma.proposta.findMany({
      where: {
        empresaId: sessao.empresaId,
        status: "PAGA",
        pagaEm: { gte: primeiroDia, lte: ultimoDia }
      }
    });

    // 3. Agrupa e calcula as comissões
    const vendedoresComPerformance = usuarios.map(user => {
      // Propostas desse usuário
      const propostasUser = propostas.filter(p => p.vendedorEmail === user.email);
      
      const volumeProduzido = propostasUser.reduce((acc, p) => acc + (p.valorLiberado || 0), 0);
      const comissaoGeradaLoja = propostasUser.reduce((acc, p) => acc + (p.valorComissao || 0), 0);
      
      let comissaoPagar = 0;
      
      // Define a base de cálculo de acordo com a configuração do usuário
      const baseCalculo = user.baseCalculoComissao === "LUCRO_LOJA" ? comissaoGeradaLoja : volumeProduzido;

      // Calcular o repasse do vendedor baseado nas regras
      if (user.tipoRemuneracao === "PERCENTUAL_FIXO" && user.percentualFixo) {
        comissaoPagar = baseCalculo * (user.percentualFixo / 100);
      } 
      else if (user.tipoRemuneracao === "FAIXAS_META" && user.regrasFaixas) {
        // regrasFaixas é um Array: [{ minVolume: 100000, percentual: 1.5 }, ...]
        const faixas = user.regrasFaixas as Array<{ minVolume: number, percentual: number }>;
        
        // Encontra a maior faixa batida (baseada sempre no Volume Produzido para bater a meta)
        const faixaBatida = faixas
          .filter(f => volumeProduzido >= f.minVolume)
          .sort((a, b) => b.minVolume - a.minVolume)[0];

        if (faixaBatida) {
          // O percentual incide sobre a base escolhida
          comissaoPagar = baseCalculo * (faixaBatida.percentual / 100);
        }
      }

      return {
        id: user.id,
        nome: user.nome || user.email.split("@")[0],
        email: user.email,
        perfilSlug: user.perfilSlug,
        tipoRemuneracao: user.tipoRemuneracao,
        baseCalculoComissao: user.baseCalculoComissao,
        salarioFixo: user.salarioFixo || 0,
        percentualFixo: user.percentualFixo,
        regrasFaixas: user.regrasFaixas,
        performanceMes: {
          qtdPropostas: propostasUser.length,
          volumeProduzido,
          comissaoGeradaLoja,
          comissaoRepasse: comissaoPagar
        }
      };
    });

    return Response.json(vendedoresComPerformance);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
