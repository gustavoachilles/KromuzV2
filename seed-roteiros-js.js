const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres.apkhetmrlmvfjckkflci:Kromuz2026Base@aws-1-sa-east-1.pooler.supabase.com:5432/postgres",
});

const prisma = new PrismaClient({ adapter });

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
  console.log("🚀 Iniciando migração de Roteiros Operacionais (CommonJS -> Prisma)...");

  const empresa = await prisma.empresa.findFirst();
  if (!empresa) {
    console.log("❌ Nenhuma empresa encontrada.");
    return;
  }

  for (const b of BANCOS_LEGADOS) {
    console.log(`\n🏦 Processando Banco: ${b.nome}`);

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
    } else {
      await prisma.banco.update({
        where: { id: banco.id },
        data: { fatorSaldo: b.fatorSaldo, ativoSimulacao: true }
      });
    }

    const produtosProps = [
      { tipo: "EMPRESTIMO_CONSIGNADO", nome: "Empréstimo Consignado Novo" },
      { tipo: "PORTABILIDADE", nome: "Portabilidade com Troco" },
      { tipo: "REFINANCIAMENTO", nome: "Refinanciamento" },
      ...(b.portRefin ? [{ tipo: "PORTABILIDADE_REFIN", nome: "Portabilidade + Refin" }] : [])
    ];

    for (const prodProp of produtosProps) {
      let produto = await prisma.produtoCredito.findFirst({
        where: { empresaId: empresa.id, bancoId: banco.id, tipoProduto: prodProp.tipo }
      });

      if (!produto) {
        produto = await prisma.produtoCredito.create({
          data: {
            empresaId: empresa.id,
            bancoId: banco.id,
            tipoProduto: prodProp.tipo,
            nomeProduto: prodProp.nome,
            ativo: true
          }
        });
      }

      const coeficientePadrao = 0.0225;
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
            tipoOperacao: prodProp.tipo,
            ativa: true,
            prioridade: 1,
            taxaMinimaAm: 1.0,
            taxaMaximaAm: 1.66,
            trocoMinimoLiberado: 100,
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
      }
    }
  }

  console.log("\n✨ Módulo de Seed Concluído! O Simulador agora tem inteligência real.");
}

seed()
  .catch((e) => {
    console.error("❌ Erro fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
