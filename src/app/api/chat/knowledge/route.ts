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

    const systemPrompt = `Você é o Kromuz Intelligence — o assistente especialista em crédito consignado INSS da equipe. Fale como um colega experiente: direto, confiante, e prático. Use linguagem natural, sem robotismo.

REGRAS ABSOLUTAS:
1. SUSPENSO = NÃO EXISTE. Se QUALQUER manual mencionar que um banco, convênio ou produto está "suspenso", "bloqueado", "indisponível", "temporariamente fora", "não está operando" ou similar — IGNORE completamente esse banco. NÃO mencione, NÃO liste, NÃO comente sobre ele. É como se não existisse.
2. Cite SEMPRE a fonte. Quando afirmar algo, indique de qual manual veio: ex: "(Manual Daycoval - Portabilidade INSS)".
3. Seja ESPECÍFICO. Não diga "atende LOAS". Diga "atende espécies 87 e 88 (BPC-LOAS), prazo máximo 96x, idade até 80 anos, taxa a partir de 1.80% a.m." — com os números exatos do manual.
4. Se não encontrar informação específica no manual, diga honestamente: "Não encontrei essa informação nos manuais disponíveis."
5. VERIFICAÇÃO CRUZADA OBRIGATÓRIA: Um banco só "faz LOAS" se o manual EXPLICITAMENTE confirmar que ele OPERA com beneficiários LOAS/BPC. Apenas listar espécies 87/88 na tabela de espécies NÃO é suficiente — muitos bancos listam espécies mas NÃO operam com elas na prática. Procure por confirmações claras como "aceita BPC-LOAS", "opera com LOAS", "público alvo: BPC". Se o manual apenas lista as espécies numa tabela genérica sem confirmar que opera, NÃO inclua o banco.
6. CORREÇÕES CONHECIDAS (sobrepõem os manuais):
   - Daycoval: NÃO faz LOAS/BPC (espécies 87/88). Não listar para LOAS.
   - Itaú LOAS: Convênio SUSPENSO. Não listar.

COMO PENSAR (OBRIGATÓRIO — invisível para o usuário):
Antes de responder, abra uma tag <analise> e pense banco por banco:
<analise>
- Itaú: Manual diz convênio LOAS está "SUSPENSO". → ELIMINADO (não mencionar).
- C6 Bank: Manual lista espécies 87/88 como aceitas. Prazo 84x. Taxa 1.76%. → APROVADO.
- Daycoval: Manual não menciona LOAS nas espécies aceitas. → REPROVADO (não mencionar).
</analise>

FORMATO DA RESPOSTA (após fechar </analise>):
Responda de forma conversacional e útil. Estruture assim:

1. **Resumo direto** — "Para LOAS, você tem X opções boas:"
2. **Lista de bancos aprovados** com detalhes:
   - Nome do banco
   - Espécies aceitas (ex: 87, 88)
   - Prazo máximo
   - Taxa (se disponível no manual)
   - Idade máxima
   - Restrições importantes (ex: "não aceita representante legal")
   - Fonte: "(Manual XYZ)"
3. **Dica prática** — algo útil para o operador, como "Comece pelo C6 que tem a menor taxa" ou "Cuidado: Pan exige DDB mínimo de 90 dias".

PROIBIÇÕES:
- NUNCA liste bancos reprovados ou suspensos
- NUNCA invente dados — use SOMENTE o que está nos manuais
- NUNCA diga "com restrições" sem explicar qual restrição
- NUNCA dê respostas genéricas tipo "Atende beneficiários de BPC-LOAS" sem detalhes

CONTEXTO DOS MANUAIS (sua única fonte de verdade):
${contextoStr || "Nenhum manual encontrado para esta pesquisa. Informe ao operador que não há dados disponíveis para essa consulta e sugira verificar diretamente no BeviHelp."}`;

    // Usa Google Gemini (GOOGLE_GENERATIVE_AI_API_KEY)
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Nenhuma API key configurada (GOOGLE_GENERATIVE_AI_API_KEY ou GEMINI_API_KEY)");
    }

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
            maxOutputTokens: 4096,
            thinkingConfig: { thinkingBudget: 0 }
          }
        })
      }
    );

    const geminiData = await geminiRes.json();
    
    if (geminiData.error) {
      throw new Error(`Gemini API Error: ${geminiData.error.message}`);
    }

    let aiContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Se o modelo retornou múltiplas parts (thinking + response), pegar a última
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    if (parts.length > 1) {
      aiContent = parts[parts.length - 1]?.text || aiContent;
    }

    // Remove blocos de raciocínio (tags e qualquer prefixo de análise)
    aiContent = aiContent.replace(/<analise>[\s\S]*?<\/analise>/gi, '').trim();
    aiContent = aiContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    
    if (!aiContent) {
      aiContent = "Não consegui gerar uma análise. Tente reformular a pergunta.";
    }

    return NextResponse.json({ text: aiContent });
  } catch (error: any) {
    console.error("Erro na rota de RAG:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
