import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Iniciando inserção de regras de teste...");
  
  const empresa = await prisma.empresa.findFirst();
  if (!empresa) {
    console.log("Nenhuma empresa encontrada.");
    return;
  }

  // 1. Criar Banco
  const banco = await prisma.banco.create({
    data: {
      empresaId: empresa.id,
      nome: "Banco Inbursa (Teste)",
      codigoCompe: "012",
      tipo: "consignado",
      status: "ativo"
    }
  });

  // 2. Criar Produto
  const produto = await prisma.produtoCredito.create({
    data: {
      empresaId: empresa.id,
      bancoId: banco.id,
      nomeProduto: "INSS - Portabilidade com Troco",
      tipoProduto: "PORTABILIDADE",
      ativo: true
    }
  });

  // 3. Criar Regra
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
      especies: { aceitas: [21, 41, 32] }
    }
  });

  // 4. Criar Tabela de Coeficiente
  await prisma.tabelaCoeficiente.create({
    data: {
      empresaId: empresa.id,
      bancoId: banco.id,
      produtoId: produto.id,
      nome: "Tabela Port + Refin - Inbursa",
      prazo: 84,
      taxaJurosMensal: 1.55,
      coeficiente: 0.0225, // 1 / coeficiente = fator multiplicador aprox 44x
      ativo: true
    }
  });

  console.log("✅ Regras e Tabelas inseridas com sucesso!");
}

seed()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
