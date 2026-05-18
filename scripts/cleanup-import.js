// Script para deletar leads importados erroneamente
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

async function main() {
  // Contar leads com origem 'importacao'
  const count = await prisma.lead.count({
    where: { origem: "importacao" },
  });
  console.log(`Encontrados ${count} leads com origem='importacao'`);

  if (count > 0) {
    const result = await prisma.lead.deleteMany({
      where: { origem: "importacao" },
    });
    console.log(`Deletados: ${result.count} leads`);
  }

  // Também limpar qualquer proposta órfã (não deveria ter, mas por segurança)
  const propostasCount = await prisma.proposta.count();
  console.log(`Total de propostas no banco: ${propostasCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
