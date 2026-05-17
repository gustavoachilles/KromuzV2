import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionEmpresaApi } from "@/lib/session";
import { getKnowledgeContext } from "@/lib/rag";

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
    
    // 1. Busca contexto via Biblioteca Central de RAG
    let contextoStr = "";
    try {
      contextoStr = await getKnowledgeContext(lastMessage.content);
    } catch (ragError) {
      console.warn("⚠️ RAG falhou, continuando sem contexto:", ragError);
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
${contextoStr || "Nenhum manual encontrado no momento. Use seu conhecimento geral sobre crédito consignado INSS."}`;

    // Usa Google Gemini (GOOGLE_GENERATIVE_AI_API_KEY)
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Nenhuma API key configurada (GOOGLE_GENERATIVE_AI_API_KEY ou GEMINI_API_KEY)");
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n---\n\nPergunta do operador:\n${lastMessage.content}` }]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    const geminiData = await geminiRes.json();
    
    if (geminiData.error) {
      throw new Error(`Gemini API Error: ${geminiData.error.message}`);
    }

    let aiContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Sem resposta da IA.";

    // Remove o bloco de raciocínio invisível antes de enviar para o front-end
    aiContent = aiContent.replace(/<analise>[\s\S]*?<\/analise>/gi, '').trim();

    return NextResponse.json({ text: aiContent });
  } catch (error: any) {
    console.error("Erro na rota de RAG:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
