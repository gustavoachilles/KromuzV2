import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';
import path from 'path';

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

// Configuração específica para o Prisma 7 (Kromuz usa o adapter-pg)
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

const BEVIHELP_DIR = path.join(process.env.HOME || '', 'Documents', 'ANTIGRAVITY', 'BEVIHELP');

// Usaremos a empresa principal para vincular o conhecimento (ou criar uma default se não houver)
async function getEmpresaId() {
  const empresa = await prisma.empresa.findFirst();
  if (empresa) return empresa.id;
  
  // Cria uma empresa fake caso a base esteja vazia (para testes)
  const novaEmpresa = await prisma.empresa.create({
    data: {
      nomeEmpresa: 'Kromuz Master',
      status: 'ativo'
    }
  });
  return novaEmpresa.id;
}

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

// Uma função simples de chunking para separar o markdown em blocos de parágrafos lógicos
function chunkText(text: string, maxChunkLength = 4000) {
  // Primeira tentativa: separar por parágrafos
  const paragraphs = text.split('\n\n');
  const chunks: string[] = [];
  let currentChunk = '';

  for (const p of paragraphs) {
    // Se um ÚNICO parágrafo for maior que o limite, precisamos quebrar ele por frases ou caracteres
    if (p.length > maxChunkLength) {
      // Adiciona o que temos no chunk atual antes de processar o parágrafo gigante
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      let subText = p;
      while (subText.length > 0) {
        let splitIdx = subText.lastIndexOf('. ', maxChunkLength);
        if (splitIdx === -1 || splitIdx < 500) splitIdx = maxChunkLength;
        
        chunks.push(subText.substring(0, splitIdx).trim());
        subText = subText.substring(splitIdx).trim();
        if (subText.length < 10) break; // Evita resíduos minúsculos
      }
      continue;
    }

    if (currentChunk.length + p.length > maxChunkLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = '';
    }
    currentChunk += p + '\n\n';
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

async function processKnowledgeBase() {
  console.log("Iniciando pipeline de geração de Embeddings (RAG)...");
  
  const empresaId = await getEmpresaId();
  const allFiles = getFilesRecursively(BEVIHELP_DIR);
  
  console.log(`Encontrados ${allFiles.length} arquivos Markdown. Processando a base completa...`);
  
  let count = 0;
  for (const filePath of allFiles) {
    count++;
    const relativePath = filePath.replace(BEVIHELP_DIR + '/', '');
    const pathParts = relativePath.split('/');
    const categoria = pathParts[0];
    const pasta = pathParts.length > 1 ? pathParts[1] : 'Geral';
    const filename = pathParts[pathParts.length - 1];
    const titulo = filename.replace('.md', '');
    
    console.log(`\n📄 [${count}/${allFiles.length}] Verificando: [${categoria}] ${titulo}`);
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const chunks = chunkText(content);
    
    // Verifica quantos chunks desse arquivo já existem no banco
    const dbCountResult = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) as count FROM "conhecimento_bevi" WHERE "url_origem" = $1',
      filePath
    ) as any[];
    
    const dbCount = Number(dbCountResult[0].count);

    if (dbCount === chunks.length) {
      console.log(`  ⏭️  Arquivo completo no banco (${dbCount}/${chunks.length} chunks). Pulando...`);
      continue;
    } else if (dbCount > 0) {
      console.log(`  🔄  Arquivo incompleto ou corrompido (${dbCount}/${chunks.length} chunks). Limpando e reprocessando...`);
      await prisma.$executeRawUnsafe(
        'DELETE FROM "conhecimento_bevi" WHERE "url_origem" = $1',
        filePath
      );
    } else {
      console.log(`  🆕  Novo arquivo encontrado. Dividido em ${chunks.length} chunks.`);
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        let embedding: number[] | null = null;
        let retries = 3;
        
        while (retries > 0 && !embedding) {
          try {
            if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'undefined') {
              embedding = Array.from({ length: 768 }, () => Math.random() - 0.5);
              console.log(`  ⚠️  Aviso: Chave OpenAI não encontrada. Usando MOCK VECTOR para o chunk ${i+1}.`);
            } else {
              const response = await fetch('https://api.openai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model: 'text-embedding-3-small',
                  input: chunk,
                  dimensions: 768
                })
              });

              const data = await response.json();
              if (data.error) throw new Error(data.error.message);
              embedding = data.data[0].embedding;
            }
          } catch (err: any) {
            retries--;
            if (retries === 0) throw err;
            console.log(`  re-tentando chunk ${i+1} (${3 - retries}/3) devido a erro: ${err.message}...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Espera 2s antes de tentar de novo
          }
        }

        if (!embedding) throw new Error("Falha ao gerar embedding após retentativas.");

        // Como o pgvector usa um tipo Unsupported no Prisma, a inserção deve ser via raw SQL
        // Converte o array Float32Array/number[] em string no formato do Postgres: '[0.1, 0.2, ...]'
        const vectorString = `[${embedding.join(',')}]`;

        await prisma.$executeRawUnsafe(`
          INSERT INTO "conhecimento_bevi" (
            "id", "empresa_id", "categoria", "pasta", "titulo_artigo", "url_origem", "conteudo_chunk", "embedding", "created_at"
          ) VALUES (
            gen_random_uuid(), 
            '${empresaId}'::uuid, 
            $1, $2, $3, $4, $5, 
            '${vectorString}'::vector, 
            NOW()
          )
        `, categoria, pasta, titulo, filePath, chunk);
        
        console.log(`  ✅ Chunk ${i+1}/${chunks.length} vetorizado e salvo no Postgres.`);
      } catch (err) {
        console.error(`  ❌ Erro ao vetorizar chunk ${i+1}:`, err);
      }
    }
  }
  
  console.log("\n✨ Processo de Teste do RAG finalizado com sucesso!");
}

processKnowledgeBase()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
