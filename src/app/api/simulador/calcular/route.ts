import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";
import { z } from "zod";

const calcSchema = z.object({
  convenioId: z.string(),
  tipoOperacao: z.string(),
  idade: z.number().optional(),
  margem: z.number()
});

export async function POST(req: Request) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const data = calcSchema.parse(body);

    if (data.margem <= 0) {
      return NextResponse.json({ error: "Margem deve ser maior que zero" }, { status: 400 });
    }

    // Busca as tabelas de coeficientes ativas para o convênio e operação selecionados
    const tabelas = await prisma.tabelaCoeficiente.findMany({
      where: {
        empresaId: sessao.empresaId,
        convenioId: data.convenioId,
        ativo: true,
        produto: {
          tipoProduto: data.tipoOperacao as any,
          ativo: true
        }
      },
      include: {
        banco: { select: { nome: true, logoUrl: true } },
        produto: { select: { nomeProduto: true, tipoProduto: true } }
      }
    });

    // Calcula as oportunidades
    const oportunidades = tabelas.map(tabela => {
      const valorLiberado = data.margem / tabela.coeficiente;
      const comissaoFlat = tabela.comissaoFlatPct ? valorLiberado * (tabela.comissaoFlatPct / 100) : 0;
      
      return {
        tipo: tabela.produto.tipoProduto,
        bancoId: tabela.bancoId,
        bancoNome: tabela.banco.nome,
        produtoId: tabela.produtoId,
        produtoNome: tabela.produto.nomeProduto,
        valorLiberado: Number(valorLiberado.toFixed(2)),
        valorParcela: data.margem,
        taxaJuros: tabela.taxaJurosMensal,
        prazo: tabela.prazo,
        comissaoEstimada: Number(comissaoFlat.toFixed(2)),
        tabelaNome: tabela.nome
      };
    });

    // Ordena pelo maior valor liberado
    oportunidades.sort((a, b) => b.valorLiberado - a.valorLiberado);

    return NextResponse.json({
      cliente: {
        nome: "Simulação Manual",
        margemLivre: data.margem,
        especie: "N/A"
      },
      oportunidades,
      contratos: [] // Manual não puxa contratos
    });

  } catch (error: any) {
    console.error("Erro na simulacao:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
