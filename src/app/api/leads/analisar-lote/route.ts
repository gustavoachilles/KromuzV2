import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";
import { z } from "zod";

const leadRowSchema = z.object({
  nome: z.string(),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  margemLivre: z.number().optional(),
  idade: z.number().optional()
});

const bodySchema = z.array(leadRowSchema);

export async function POST(req: Request) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const leadsRaw = bodySchema.parse(body);

    // Buscar a melhor tabela de coeficiente de "EMPRESTIMO_CONSIGNADO" para simulação rápida
    const tabelas = await prisma.tabelaCoeficiente.findMany({
      where: {
        empresaId: sessao.empresaId,
        ativo: true,
        produto: { tipoProduto: "EMPRESTIMO_CONSIGNADO", ativo: true }
      },
      include: { banco: true, produto: true }
    });

    let totalLeads = leadsRaw.length;
    let leadsComOportunidade = 0;
    let volumeTotalDisponivel = 0;

    // Processa a análise na memória
    const leadsAnalisados = leadsRaw.map(lead => {
      let melhorOportunidade = null;

      if (lead.margemLivre && lead.margemLivre > 0 && tabelas.length > 0) {
        // Acha a tabela com menor coeficiente (maior valor liberado)
        let melhorTabela = tabelas[0];
        for (const t of tabelas) {
          if (t.coeficiente < melhorTabela.coeficiente) melhorTabela = t;
        }

        const valorLiberado = lead.margemLivre / melhorTabela.coeficiente;
        
        melhorOportunidade = {
          bancoNome: melhorTabela.banco.nome,
          valorLiberado: Number(valorLiberado.toFixed(2)),
          parcela: lead.margemLivre
        };

        leadsComOportunidade++;
        volumeTotalDisponivel += valorLiberado;
      }

      return {
        ...lead,
        oportunidade: melhorOportunidade
      };
    });

    return NextResponse.json({
      resumo: {
        totalLeads,
        leadsComOportunidade,
        volumeTotalDisponivel: Number(volumeTotalDisponivel.toFixed(2))
      },
      leads: leadsAnalisados
    });

  } catch (error: any) {
    console.error("Erro na analise:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
