import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Só funciona em desenvolvimento
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Rota disponível apenas em desenvolvimento." }, { status: 404 });
  }

  try {
    console.log("🌱 Iniciando inserção de regras de teste...");
    
    let empresa = await prisma.empresa.findFirst();
    if (!empresa) {
      empresa = await prisma.empresa.create({
        data: {
          nomeEmpresa: "Empresa de Teste Kromuz",
          status: "ativo",
          planoSlug: "premium"
        }
      });
    }

    // Verifica se já tem o banco Inbursa
    let banco = await prisma.banco.findFirst({
      where: { empresaId: empresa.id, nome: "Banco Inbursa (Teste)" }
    });

    if (!banco) {
      banco = await prisma.banco.create({
        data: {
          empresaId: empresa.id,
          nome: "Banco Inbursa (Teste)",
          codigoCompe: "012",
          tipo: "consignado",
          status: "ativo"
        }
      });
    }

    // Verifica produto
    let produto = await prisma.produtoCredito.findFirst({
      where: { bancoId: banco.id, tipoProduto: "PORTABILIDADE" }
    });

    if (!produto) {
      produto = await prisma.produtoCredito.create({
        data: {
          empresaId: empresa.id,
          bancoId: banco.id,
          nomeProduto: "INSS - Portabilidade com Troco",
          tipoProduto: "PORTABILIDADE",
          ativo: true
        }
      });
    }

    // Regra
    const regraCount = await prisma.regraProdutoCredito.count({
      where: { bancoId: banco.id }
    });

    if (regraCount === 0) {
      await prisma.regraProdutoCredito.create({
        data: {
          empresaId: empresa.id,
          bancoId: banco.id,
          bancoNome: banco.nome,
          produtoId: produto.id,
          produtoNome: produto.nomeProduto,
          tipoOperacao: "PORTABILIDADE",
          ativa: true,
          prioridade: 1,
          taxaMinimaAm: 1.5,
          taxaMaximaAm: 1.9,
          trocoMinimoLiberado: 100,
          portPermitido: true,
          faixasEtarias: [{ idade_min: 20, idade_max: 75 }],
          especies: { aceitas: [21, 41, 32, 0] } // Adicionado espécie 0 temporariamente
        }
      });
    }

    // Tabela
    const tabelaCount = await prisma.tabelaCoeficiente.count({
      where: { bancoId: banco.id }
    });

    if (tabelaCount === 0) {
      await prisma.tabelaCoeficiente.create({
        data: {
          empresaId: empresa.id,
          bancoId: banco.id,
          produtoId: produto.id,
          nome: "Tabela Port + Refin - Inbursa",
          prazo: 84,
          taxaJurosMensal: 1.55,
          coeficiente: 0.0225,
          ativo: true
        }
      });
    }

    return NextResponse.json({ message: "✅ Regras e Tabelas inseridas com sucesso!" });
  } catch (error: any) {
    console.error("Erro no seed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
