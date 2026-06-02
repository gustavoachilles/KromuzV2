import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionEmpresaApi } from "@/lib/session";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    // Autenticação segura via Sessão
    const sessao = await getSessionEmpresaApi();
    if (!sessao) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1];
    
    // 1. Gerar o embedding da pergunta (Usando OpenAI)
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
          input: lastMessage.content,
          dimensions: 768
        })
      });
      const embData = await embRes.json();
      if (!embData.error) {
        queryEmbedding = embData.data[0].embedding;
      }
    }

    // 2. Extração de Palavras-Chave para Busca Híbrida
    const queryText = lastMessage.content.toLowerCase();
    let keywordFilter = "";
    
    // Identifica se a pergunta é sobre uma espécie específica
    const hasEspecie32 = queryText.includes("32") || queryText.includes("invalidez");
    const hasEspecie87 = queryText.includes("87") || queryText.includes("88") || queryText.includes("loas") || queryText.includes("bpc");
    
    if (hasEspecie32) {
      keywordFilter = `WHERE ("titulo_artigo" ILIKE '%invalidez%' OR "titulo_artigo" ILIKE '%32%') AND "titulo_artigo" NOT ILIKE '%resumo%' AND "categoria" = 'INSS'`;
    } else if (hasEspecie87) {
      keywordFilter = `WHERE ("titulo_artigo" ILIKE '%loas%' OR "titulo_artigo" ILIKE '%bpc%') AND "titulo_artigo" NOT ILIKE '%resumo%' AND "categoria" = 'INSS'`;
    } else {
      keywordFilter = `WHERE "categoria" = 'INSS' AND "titulo_artigo" NOT ILIKE '%resumo%'`;
    }

    let contextoStr = "";

    // 3. Buscar no PostgreSQL via pgvector + Keyword (Busca Híbrida) para encontrar os MELHORES MANUAIS
    if (queryEmbedding.length === 768) {
      const vectorString = `[${queryEmbedding.join(',')}]`;
      
      // Passo 1: Descobrir quais são os 50 manuais (títulos) mais relevantes
      // Aumentamos o limite para 50 para englobar TODOS OS BANCOS que operam o produto/espécie
      const topManuais = await prisma.$queryRawUnsafe<any[]>(`
        SELECT "titulo_artigo", MIN(embedding <=> '${vectorString}'::vector) as distance
        FROM "conhecimento_bevi"
        ${keywordFilter}
        GROUP BY "titulo_artigo"
        ORDER BY distance ASC
        LIMIT 50;
      `);

      if (topManuais && topManuais.length > 0) {
        const titulos = topManuais.map(m => m.titulo_artigo);
        const placeholders = titulos.map((_, i) => `$${i + 1}`).join(',');
        
        // Passo 2: Puxar o documento INTEIRO (todos os chunks) e ORDENAR para montar o texto na ordem certa
        const manualChunks = await prisma.$queryRawUnsafe<any[]>(`
          SELECT "categoria", "titulo_artigo", "conteudo_chunk"
          FROM "conhecimento_bevi"
          WHERE "titulo_artigo" IN (${placeholders})
          ORDER BY "titulo_artigo" ASC, "created_at" ASC
        `, ...titulos);

        // Agrupar e reconstruir o manual
        const manuaisCompletos: Record<string, string> = {};
        manualChunks.forEach(chunk => {
          const key = `[${chunk.categoria} > ${chunk.titulo_artigo}]`;
          if (!manuaisCompletos[key]) manuaisCompletos[key] = "";
          manuaisCompletos[key] += chunk.conteudo_chunk + "\n\n";
        });

        contextoStr = Object.entries(manuaisCompletos)
          .map(([titulo, conteudo]) => `MANUAL: ${titulo}\nCONTEÚDO:\n${conteudo}`)
          .join("\n\n---------------------------\n\n");
          
        const fs = require('fs');
        fs.writeFileSync('DEBUG_CONTEXTO.md', contextoStr);

        // Truncate context string to prevent OpenAI token limit errors (128k tokens limit ~ 400k characters)
        const MAX_CONTEXT_LENGTH = 350000;
        if (contextoStr.length > MAX_CONTEXT_LENGTH) {
          console.warn(`⚠️ [RAG] Contexto truncado. Original: ${contextoStr.length} chars. Novo: ${MAX_CONTEXT_LENGTH} chars.`);
          contextoStr = contextoStr.substring(0, MAX_CONTEXT_LENGTH) + "\n\n[AVISO: CONTEXTO TRUNCADO POR LIMITE DE TAMANHO]";
        }
      }
    }

    const systemPrompt = `Você é o Especialista Sênior Kromuz, um oráculo infalível de crédito consignado. Você vai analisar manuais para encontrar quais bancos atendem o perfil do cliente.

COMO O SEU CÉREBRO FUNCIONA (OBRIGATÓRIO):
Para não cometer erros de matemática básica (como achar que 30 anos é maior que 40 anos), você DEVE iniciar sua resposta abrindo uma tag <analise>.
Dentro dessa tag, analise banco por banco. Exemplo:
<analise>
- C6 Bank: Regra "menos de 55 anos". Cliente tem 30. 30 é menor que 55. APROVADO.
- Daycoval: Regra "a partir de 40". Cliente tem 30. 30 não é maior que 40. REPROVADO.
</analise>

REGRA DE OURO PARA A RESPOSTA FINAL:
Após fechar a tag </analise>, escreva a resposta para o usuário.
Você está estritamente PROIBIDO de mencionar, listar ou justificar qualquer banco que foi REPROVADO na sua análise.
Liste APENAS os bancos APROVADOS.

SUA RESPOSTA FINAL:
- Se houver pelo menos 1 banco aprovado, liste as opções, explicando a regra exata (ex: "última perícia a partir de JAN/17"). Nunca use "com restrições".
- Se NENHUM banco aprovar, diga que não existem opções.

CONTEXTO DOS MANUAIS COMPLETOS:
${contextoStr}`;

    // 4. Gerar resposta via OpenAI (GPT-4o mini)
    const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: lastMessage.content }
        ],
        temperature: 0.1
      })
    });

    const chatData = await chatRes.json();
    
    if (chatData.error) {
      throw new Error(`OpenAI API Error: ${chatData.error.message}`);
    }

    let aiContent = chatData.choices[0].message.content;
    
    const fs = require('fs');
    fs.writeFileSync('DEBUG_RAW_RESPONSE.txt', aiContent);

    // Remove o bloco de raciocínio invisível antes de enviar para o front-end
    aiContent = aiContent.replace(/<analise>[\s\S]*?<\/analise>/gi, '').trim();

    return NextResponse.json({ text: aiContent });
  } catch (error: any) {
    console.error("Erro na rota de RAG:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

