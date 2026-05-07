import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDb() {
  const regras = await prisma.regraProdutoCredito.findMany();
  const tabelas = await prisma.tabelaCoeficiente.findMany();
  console.log("Regras:", JSON.stringify(regras, null, 2));
  console.log("Tabelas:", JSON.stringify(tabelas, null, 2));
}

checkDb()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
