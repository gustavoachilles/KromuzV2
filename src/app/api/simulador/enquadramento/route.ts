import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      empresaId,
      beneficioTipo,
      especieBeneficio,
      idade,
      valorBeneficio,
      margemDisponivel,
      valorSolicitado,
      prazoDesejado,
      clienteNome,
      salvarSimulacao,
    } = body;

    if (!empresaId || !beneficioTipo || idade == null) {
      return NextResponse.json({ error: "Dados obrigatórios incompletos" }, { status: 400 });
    }

    // 1. Buscar todas as regras ativas da empresa para Portabilidade ou Empréstimo
    const regrasAtivas = await prisma.regraProdutoCredito.findMany({
      where: {
        empresaId,
        ativa: true,
      },
      include: {
        banco: true,
        produto: true,
      },
    });

    // 2. Buscar Tabelas de Coeficientes ativas
    const tabelasAtivas = await prisma.tabelaCoeficiente.findMany({
      where: {
        empresaId,
        ativo: true,
      },
    });

    const ranking = [];

    // 3. Processar Motor (Enquadramento Simples)
    for (const regra of regrasAtivas) {
      let elegivel = true;
      const motivosRecusa: string[] = [];

      // Validar Idade
      if (regra.idadeMin && idade < regra.idadeMin) {
        elegivel = false;
        motivosRecusa.push(`Idade mínima exigida: ${regra.idadeMin} anos`);
      }
      if (regra.idadeMax && idade > regra.idadeMax) {
        elegivel = false;
        motivosRecusa.push(`Idade máxima permitida: ${regra.idadeMax} anos`);
      }

      // Validar Convênio/Espécie (simplificado por nome do produto ou regra)
      if (regra.especiesAceitas) {
        try {
          const especiesStr = String(regra.especiesAceitas);
          if (especiesStr !== "[]" && especiesStr !== "" && especieBeneficio) {
             if (!especiesStr.includes(especieBeneficio)) {
               elegivel = false;
               motivosRecusa.push(`Espécie ${especieBeneficio} não permitida`);
             }
          }
        } catch (e) {
          // ignora
        }
      }

      if (elegivel) {
        // Encontrar a melhor tabela de coeficiente para esta regra (que pertença ao mesmo produto/banco)
        const tabela = tabelasAtivas.find((t) => t.bancoId === regra.bancoId && t.produtoId === regra.produtoId);
        
        let valorMaximo = 0;
        let parcelaEstimada = 0;
        let scoreAprovacao = 90; // Começa alto
        const explicacaoScore = [];

        if (tabela) {
          if (margemDisponivel && tabela.coeficiente > 0) {
            valorMaximo = margemDisponivel / tabela.coeficiente;
          }
          if (valorSolicitado && tabela.coeficiente > 0) {
             parcelaEstimada = valorSolicitado * tabela.coeficiente;
          }

          if (tabela.taxaJurosMensal < 1.6) {
             scoreAprovacao += 5;
             explicacaoScore.push("Taxa de juros excelente");
          } else if (tabela.taxaJurosMensal > 1.8) {
             scoreAprovacao -= 10;
          }

          if (valorSolicitado && valorMaximo > 0 && valorSolicitado > valorMaximo) {
            scoreAprovacao -= 30; // Cliente quer mais do que o banco libera
            explicacaoScore.push("Valor desejado acima do limite aprovado");
          } else if (valorSolicitado && valorMaximo > 0) {
            explicacaoScore.push("Margem compatível com o valor desejado");
          }
        }

        ranking.push({
          banco_nome: regra.banco.nome,
          banco_id: regra.bancoId,
          tipo_produto: regra.produto.nomeProduto,
          taxa_media: tabela?.taxaJurosMensal || null,
          prazo_maximo: tabela?.prazoMaximo || null,
          valor_maximo: valorMaximo,
          parcela_estimada: parcelaEstimada,
          score_aprovacao: Math.max(0, Math.min(100, scoreAprovacao)),
          explicacao_score: explicacaoScore,
        });
      }
    }

    // Ordenar ranking (maior score primeiro)
    ranking.sort((a, b) => b.score_aprovacao - a.score_aprovacao);
    
    // Atribuir posições
    ranking.forEach((r, idx) => { r.posicao = idx + 1; });

    let simulacaoId = null;

    if (salvarSimulacao) {
      try {
        // @ts-ignore - Prisma gerado pode não estar atualizado localmente
        const sim = await prisma.simulacaoCredito.create({
          data: {
            empresaId,
            clienteNome: clienteNome || "Anônimo",
            beneficioTipo,
            especieBeneficio,
            idade: Number(idade),
            valorBeneficio: valorBeneficio ? Number(valorBeneficio) : null,
            margemDisponivel: margemDisponivel ? Number(margemDisponivel) : null,
            valorSolicitado: valorSolicitado ? Number(valorSolicitado) : null,
            prazoDesejado: prazoDesejado ? Number(prazoDesejado) : null,
            melhorBanco: ranking.length > 0 ? ranking[0].banco_nome : null,
            melhorScore: ranking.length > 0 ? ranking[0].score_aprovacao : null,
            totalBancosElegiveis: ranking.length,
          },
        });
        simulacaoId = sim.id;
      } catch (e) {
        console.error("Erro ao salvar simulação:", e);
      }
    }

    return NextResponse.json({
      sucesso: true,
      total_elegiveis: ranking.length,
      melhor_score: ranking.length > 0 ? ranking[0].score_aprovacao : 0,
      valor_maximo_aprovavel: ranking.length > 0 ? Math.max(...ranking.map(r => r.valor_maximo)) : 0,
      score_medio: ranking.length > 0 ? Math.round(ranking.reduce((acc, r) => acc + r.score_aprovacao, 0) / ranking.length) : 0,
      ranking,
      produtos_disponiveis: Array.from(new Set(ranking.map(r => r.tipo_produto))),
      simulacao_id: simulacaoId
    });
  } catch (error: any) {
    console.error("[SIMULADOR_ENQUADRAMENTO]", error);
    return NextResponse.json({ error: "Falha ao processar enquadramento" }, { status: 500 });
  }
}
