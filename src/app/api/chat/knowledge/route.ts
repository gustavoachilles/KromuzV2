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
    const contextoStr = await getKnowledgeContext(lastMessage.content);

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

