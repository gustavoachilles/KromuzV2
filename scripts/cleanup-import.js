const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const empresaId = "d0acf869-35f9-476b-ace3-31cd17797325";
  
  const delP = await prisma.proposta.deleteMany({ where: { empresaId } });
  console.log(`Propostas deletadas: ${delP.count}`);
  
  const delL = await prisma.lead.deleteMany({ where: { empresaId } });
  console.log(`Leads deletados: ${delL.count}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
