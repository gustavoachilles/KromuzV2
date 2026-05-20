import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BANCOS_LEGADOS = [
  { nome: "DAYCOVAL", minPag: 12, minRest: 12, minParc: 100, port: true, refin: true, portRefin: true, fatorSaldo: 0.85 },
  { nome: "BMG", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: true, fatorSaldo: 0.72 },
  { nome: "PAN", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: true, fatorSaldo: 0.74 },
  { nome: "FACTA", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: true, fatorSaldo: 0.73 },
  { nome: "ITAU", minPag: 15, minRest: 12, minParc: 150, port: true, refin: true, portRefin: false, fatorSaldo: 0.75 },
  { nome: "BRADESCO", minPag: 15, minRest: 12, minParc: 150, port: true, refin: true, portRefin: false, fatorSaldo: 0.75 },
  { nome: "CAIXA", minPag: 15, minRest: 18, minParc: 100, port: true, refin: true, portRefin: false, fatorSaldo: 0.73 },
  { nome: "BANCO DO BRASIL", minPag: 15, minRest: 12, minParc: 100, port: true, refin: true, portRefin: false, fatorSaldo: 0.72 },
  { nome: "SANTANDER", minPag: 12, minRest: 12, minParc: 100, port: true, refin: true, portRefin: true, fatorSaldo: 0.72 },
  { nome: "SAFRA", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: true, fatorSaldo: 0.72 },
  { nome: "AGIBANK", minPag: 6, minRest: 12, minParc: 60, port: true, refin: true, portRefin: true, fatorSaldo: 0.74 },
  { nome: "C6", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: true, fatorSaldo: 0.73 },
  { nome: "BANRISUL", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: false, fatorSaldo: 0.72 },
  { nome: "SICOOB", minPag: 12, minRest: 12, minParc: 80, port: true, refin: true, portRefin: false, fatorSaldo: 0.72 },
];

async function seed() {
  console.log("🚀 Iniciando migração de Roteiros Operacionais (Legado -> Prisma)...");

  const empresa = await prisma.empresa.findFirst();
  if (!empresa) {
    console.log("❌ Nenhuma empresa encontrada no banco de dados. Cadastre uma empresa primeiro.");
    return;
  }

  for (const b of BANCOS_LEGADOS) {
    console.log(`\n🏦 Processando Banco: ${b.nome}`);

    // 1. Criar ou Encontrar o Banco
    let banco = await prisma.banco.findFirst({
      where: { empresaId: empresa.id, nome: b.nome }
    });

    if (!banco) {
      banco = await prisma.banco.create({
        data: {
          empresaId: empresa.id,
          nome: b.nome,
          tipo: "consignado",
          status: "ativo",
          fatorSaldo: b.fatorSaldo,
          ativoSimulacao: true
        }
      });
      console.log(`  ✅ Banco Criado: ${banco.id}`);
    } else {
      console.log(`  ➡️ Banco já existe: ${banco.id}`);
      await prisma.banco.update({
        where: { id: banco.id },
        data: { fatorSaldo: b.fatorSaldo, ativoSimulacao: true }
      });
    }

    // 2. Definir os Produtos a serem criados
    const produtosProps = [
      { tipo: "EMPRESTIMO_CONSIGNADO", nome: "Empréstimo Consignado Novo" },
      { tipo: "PORTABILIDADE", nome: "Portabilidade com Troco" },
      { tipo: "REFINANCIAMENTO", nome: "Refinanciamento" },
      ...(b.portRefin ? [{ tipo: "PORTABILIDADE_REFIN", nome: "Portabilidade + Refin" }] : [])
    ];

    for (const prodProp of produtosProps) {
      // 3. Criar ou Encontrar Produto
      let produto = await prisma.produtoCredito.findFirst({
        where: { empresaId: empresa.id, bancoId: banco.id, tipoProduto: prodProp.tipo as any }
      });

      if (!produto) {
        produto = await prisma.produtoCredito.create({
          data: {
            empresaId: empresa.id,
            bancoId: banco.id,
            tipoProduto: prodProp.tipo as any,
            nomeProduto: prodProp.nome,
            ativo: true
          }
        });
      }

      // 4. Injetar a Tabela de Coeficiente Padrão (84x - 1.66%)
      const coeficientePadrao = 0.0225; // Exemplo de Fator (x44 approx)
      const taxaJurosMensal = 1.66;
      
      const tabelaExistente = await prisma.tabelaCoeficiente.findFirst({
        where: { bancoId: banco.id, produtoId: produto.id, prazo: 84 }
      });

      if (!tabelaExistente) {
        await prisma.tabelaCoeficiente.create({
          data: {
            empresaId: empresa.id,
            bancoId: banco.id,
            produtoId: produto.id,
            nome: `Tabela Padrão INSS 84x (${b.nome})`,
            prazo: 84,
            taxaJurosMensal: taxaJurosMensal,
            coeficiente: coeficientePadrao,
            ativo: true
          }
        });
      }

      // 5. Injetar a Regra Operacional do Banco
      const regraExistente = await prisma.regraProdutoCredito.findFirst({
        where: { bancoId: banco.id, produtoId: produto.id }
      });

      if (!regraExistente) {
        await prisma.regraProdutoCredito.create({
          data: {
            empresaId: empresa.id,
            bancoId: banco.id,
            bancoNome: banco.nome,
            produtoId: produto.id,
            produtoNome: produto.nomeProduto,
            tipoOperacao: prodProp.tipo as any,
            ativa: true,
            prioridade: 1,
            taxaMinimaAm: 1.0, // Taxa mínima para permitir port
            taxaMaximaAm: 1.66,
            trocoMinimoLiberado: 100, // Regra genérica
            portPermitido: prodProp.tipo.includes("PORTABILIDADE") ? b.port : undefined,
            portParcelasMinPagas: prodProp.tipo.includes("PORTABILIDADE") ? b.minPag : undefined,
            refinPermitido: prodProp.tipo.includes("REFINANCIAMENTO") ? b.refin : undefined,
            refinParcelasMinPagas: prodProp.tipo.includes("REFINANCIAMENTO") ? b.minPag : undefined,
            refinValorMin: b.minParc,
            faixasEtarias: [{ idade_min: 21, idade_max: 73 }],
            especies: { aceitas: [21, 32, 41, 42, 46, 92] }
          }
        });
        console.log(`  ✅ Regra Criada: ${prodProp.tipo}`);
      } else {
        console.log(`  ➡️ Regra já existe: ${prodProp.tipo}`);
      }
    }
  }

  console.log("\n✨ Módulo de Seed Concluído! O Simulador agora tem inteligência real para os 14 bancos principais.");
}

seed()
  .catch((e) => {
    console.error("❌ Erro fatal durante o Seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
