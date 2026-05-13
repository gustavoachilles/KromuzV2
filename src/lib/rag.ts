import { prisma } from "@/lib/prisma";

export async function getKnowledgeContext(query: string) {
  try {
    // 1. Gerar o embedding da pergunta (OpenAI)
    let queryEmbedding: number[] = [];
    if (process.env.OPENAI_API_KEY) {
      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: query,
          dimensions: 768
        })
      });
      const embData = await embRes.json();
      if (!embData.error) {
        queryEmbedding = embData.data[0].embedding;
      }
    }

    if (queryEmbedding.length !== 768) return "";

    // 2. Busca Híbrida
    const queryText = query.toLowerCase();
    let keywordFilter = "";
    if (queryText.includes("32") || queryText.includes("invalidez")) {
      keywordFilter = `WHERE ("titulo_artigo" ILIKE '%invalidez%' OR "titulo_artigo" ILIKE '%32%') AND "titulo_artigo" NOT ILIKE '%resumo%' AND "categoria" = 'INSS'`;
    } else if (queryText.includes("87") || queryText.includes("88") || queryText.includes("loas") || queryText.includes("bpc")) {
      keywordFilter = `WHERE ("titulo_artigo" ILIKE '%loas%' OR "titulo_artigo" ILIKE '%bpc%') AND "titulo_artigo" NOT ILIKE '%resumo%' AND "categoria" = 'INSS'`;
    } else {
      keywordFilter = `WHERE "categoria" = 'INSS' AND "titulo_artigo" NOT ILIKE '%resumo%'`;
    }

    const vectorString = `[${queryEmbedding.join(',')}]`;
    
    // Passo 1: Top 20 Manuais (Reduzido para Webhook ser mais rápido)
    const topManuais = await prisma.$queryRawUnsafe<any[]>(`
      SELECT "titulo_artigo", MIN(embedding <=> '${vectorString}'::vector) as distance
      FROM "conhecimento_bevi"
      ${keywordFilter}
      GROUP BY "titulo_artigo"
      ORDER BY distance ASC
      LIMIT 20;
    `);

    if (!topManuais || topManuais.length === 0) return "";

    const titulos = topManuais.map(m => m.titulo_artigo);
    const placeholders = titulos.map((_, i) => `$${i + 1}`).join(',');
    
    // Passo 2: Reconstruir manuais
    const manualChunks = await prisma.$queryRawUnsafe<any[]>(`
      SELECT "categoria", "titulo_artigo", "conteudo_chunk"
      FROM "conhecimento_bevi"
      WHERE "titulo_artigo" IN (${placeholders})
      ORDER BY "titulo_artigo" ASC, "created_at" ASC
    `, ...titulos);

    const manuaisCompletos: Record<string, string> = {};
    manualChunks.forEach(chunk => {
      const key = `[${chunk.categoria} > ${chunk.titulo_artigo}]`;
      if (!manuaisCompletos[key]) manuaisCompletos[key] = "";
      manuaisCompletos[key] += chunk.conteudo_chunk + "\n\n";
    });

    return Object.entries(manuaisCompletos)
      .map(([titulo, conteudo]) => `MANUAL: ${titulo}\nCONTEÚDO:\n${conteudo}`)
      .join("\n\n---------------------------\n\n");

  } catch (error) {
    console.error("Erro no getKnowledgeContext:", error);
    return "";
  }
}
