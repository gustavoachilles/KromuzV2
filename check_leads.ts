import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const contagens = await prisma.lead.groupBy({
    by: ['status'],
    _count: true
  });
  console.log("Status Counts:", contagens);

  const colunas = await prisma.pipelineColuna.findMany({
    select: { nome: true }
  });
  console.log("Colunas no banco:", colunas);
}

main().catch(console.error).finally(() => prisma.$disconnect());
