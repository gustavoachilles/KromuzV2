import { prisma } from "@/lib/prisma";

export async function getKnowledgeContext(query: string) {
  try {
    const queryLower = query.toLowerCase();

    // Detectar categoria da pergunta para filtrar artigos relevantes
    let keywordConditions: string[] = [];
    
    if (queryLower.includes("loas") || queryLower.includes("bpc") || queryLower.includes("87") || queryLower.includes("88")) {
      keywordConditions = ["loas", "bpc", "87", "88"];
    } else if (queryLower.includes("invalidez") || queryLower.includes("32")) {
      keywordConditions = ["invalidez", "32", "auxilio"];
    } else if (queryLower.includes("41") || queryLower.includes("aposentadoria")) {
      keywordConditions = ["aposentadoria", "41"];
    } else if (queryLower.includes("42") || queryLower.includes("tempo")) {
      keywordConditions = ["tempo", "42"];
    }

    // Extrair nomes de bancos da pergunta
    const bancosConhecidos = ["facta","pan","bmg","c6","daycoval","cred capital","total cash","quero mais","presença","mercantil","agibank","ole","safra","itau","bradesco","bb","banco do brasil","caixa","master","cetelem"];
    const bancosNaPergunta = bancosConhecidos.filter(b => queryLower.includes(b));

    // Construir query SQL dinâmica para busca por relevância textual
    let whereConditions = [`"categoria" = 'INSS'`];
    whereConditions.push(`"titulo_artigo" NOT ILIKE '%resumo%'`);

    // Filtrar por banco se mencionado
    if (bancosNaPergunta.length > 0) {
      const bancoFilters = bancosNaPergunta.map(b => `"titulo_artigo" ILIKE '%${b}%'`).join(" OR ");
      whereConditions.push(`(${bancoFilters})`);
    }

    // Buscar artigos relevantes por keyword
    let artigos: any[] = [];
    
    if (keywordConditions.length > 0) {
      const kwFilters = keywordConditions.map(kw => `("titulo_artigo" ILIKE '%${kw}%' OR "conteudo_chunk" ILIKE '%${kw}%')`).join(" OR ");
      
      artigos = await prisma.$queryRawUnsafe<any[]>(`
        SELECT DISTINCT "titulo_artigo"
        FROM "conhecimento_bevi"
        WHERE ${whereConditions.join(" AND ")} AND (${kwFilters})
        LIMIT 25
      `);
    }

    // Se não encontrou por keyword específica, buscar por texto livre
    if (artigos.length === 0) {
      const palavras = queryLower.split(/\s+/).filter(w => w.length > 3);
      if (palavras.length > 0) {
        const textFilters = palavras.slice(0, 5).map(p => `"conteudo_chunk" ILIKE '%${p}%'`).join(" OR ");
        artigos = await prisma.$queryRawUnsafe<any[]>(`
          SELECT DISTINCT "titulo_artigo"
          FROM "conhecimento_bevi"
          WHERE ${whereConditions.join(" AND ")} AND (${textFilters})
          LIMIT 25
        `);
      }
    }

    // Se ainda não encontrou nada, buscar todos
    if (artigos.length === 0) {
      artigos = await prisma.$queryRawUnsafe<any[]>(`
        SELECT DISTINCT "titulo_artigo"
        FROM "conhecimento_bevi"
        WHERE ${whereConditions.join(" AND ")}
        ORDER BY "titulo_artigo" ASC
        LIMIT 25
      `);
    }

    if (artigos.length === 0) return "";

    const titulos = artigos.map((a: any) => a.titulo_artigo);
    const placeholders = titulos.map((_: any, i: number) => `$${i + 1}`).join(",");

    // Reconstruir manuais completos
    const chunks = await prisma.$queryRawUnsafe<any[]>(`
      SELECT "categoria", "titulo_artigo", "conteudo_chunk"
      FROM "conhecimento_bevi"
      WHERE "titulo_artigo" IN (${placeholders})
      ORDER BY "titulo_artigo" ASC, "created_at" ASC
    `, ...titulos);

    const manuais: Record<string, string> = {};
    chunks.forEach((c: any) => {
      const key = `[${c.categoria} > ${c.titulo_artigo}]`;
      if (!manuais[key]) manuais[key] = "";
      manuais[key] += c.conteudo_chunk + "\n\n";
    });

    const resultado = Object.entries(manuais)
      .map(([titulo, conteudo]) => `MANUAL: ${titulo}\nCONTEÚDO:\n${conteudo}`)
      .join("\n\n---------------------------\n\n");

    console.log(`[RAG] Encontrados ${Object.keys(manuais).length} manuais para query: "${query.substring(0, 50)}..."`);
    return resultado;

  } catch (error) {
    console.error("[RAG] Erro:", error);
    return "";
  }
}
