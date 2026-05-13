import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';

// Carrega variáveis de ambiente manualmente
const PROJECT_DIR = path.join(process.env.HOME || '', 'Documents', 'ANTIGRAVITY', 'KROMUZ CLAUDE V2', 'kromuz');
const envPath = path.join(PROJECT_DIR, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = value;
    }
  });
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const BEVIHELP_DIR = path.join(process.env.HOME || '', 'Documents', 'ANTIGRAVITY', 'BEVIHELP');

function getFilesRecursively(dir: string, fileList: string[] = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function audit() {
  console.log("🔍 Iniciando Auditoria da Base de Conhecimento RAG...");
  
  const allLocalFiles = getFilesRecursively(BEVIHELP_DIR);
  console.log(`📂 Arquivos locais encontrados: ${allLocalFiles.length}`);
  
  // Busca contagem no banco
  const dbCountResult = await prisma.$queryRawUnsafe(
    'SELECT COUNT(DISTINCT "url_origem") as count FROM "conhecimento_bevi"'
  ) as any[];
  const dbCount = Number(dbCountResult[0].count);
  console.log(`🗄️  Arquivos no Banco de Dados: ${dbCount}`);
  
  const totalChunksResult = await prisma.$queryRawUnsafe(
    'SELECT COUNT(*) as count FROM "conhecimento_bevi"'
  ) as any[];
  console.log(`🧩 Total de Chunks (fragmentos): ${totalChunksResult[0].count}`);

  if (dbCount === allLocalFiles.length) {
    console.log("\n✅ SUCESSO: Paridade total entre arquivos locais e banco de dados!");
  } else {
    console.log(`\n⚠️  AVISO: Diferença de ${allLocalFiles.length - dbCount} arquivos detectada.`);
  }

  console.log("\n📊 Distribuição por Categoria:");
  const categories = await prisma.$queryRawUnsafe(`
    SELECT categoria, COUNT(DISTINCT url_origem) as total 
    FROM conhecimento_bevi 
    GROUP BY categoria 
    ORDER BY total DESC
  `) as any[];
  
  categories.forEach(c => {
    console.log(`  - ${c.categoria.padEnd(25)}: ${c.total} manuais`);
  });

  console.log("\n✨ Auditoria finalizada!");
}

audit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
