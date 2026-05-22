import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const cargos = await prisma.cargo.findMany();
  for (const c of cargos) {
    if (c.nome.toLowerCase().includes('admin') || c.nome.toLowerCase() === 'administrador' || c.nome.toLowerCase().includes('gerente')) {
      const perms = typeof c.permissoes === 'object' && c.permissoes !== null ? c.permissoes : {};
      await prisma.cargo.update({
        where: { id: c.id },
        data: { permissoes: { ...perms, rh: true, contabil: true } }
      });
      console.log('Atualizou cargo:', c.nome);
    }
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
