import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";

export const maxDuration = 60; // Extração complexa pode demorar

export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { textoHiscon } = await req.json();

    if (!textoHiscon) {
      return NextResponse.json({ error: "Texto do extrato não fornecido." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Chave da API Gemini não configurada." }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const payload = {
      contents: [{
        parts: [
          { text: `Você é um robô "Caçador de Refinanciamento e Portabilidade" para correspondentes bancários.
O usuário vai colar abaixo o texto bruto de um extrato de empréstimos (HISCON/INSS).
Sua missão é analisar os contratos ativos e sugerir oportunidades de negócio (Refinanciamento no mesmo banco ou Portabilidade para outro banco).
Considere que contratos com mais de 12 parcelas pagas geralmente dão bom troco. A taxa média de mercado hoje é 1.66% a.m.

Retorne APENAS um JSON no seguinte formato:
{
  "analiseGeral": "Breve resumo do perfil do cliente (ex: Possui 3 contratos ativos, margem negativa, boas opções de portabilidade).",
  "oportunidades": [
    {
      "bancoOrigem": "Nome do Banco do contrato atual",
      "parcelaAtual": 150.00,
      "saldoDevedorEstimado": 4500.00,
      "acaoSugerida": "Portabilidade para Banco X" ou "Refinanciamento",
      "trocoEstimado": 1200.00,
      "motivo": "Já tem 24 parcelas pagas, taxa antiga era muito alta."
    }
  ]
}

Extrato do Cliente:
---
${textoHiscon}
---` }
        ]
      }],
      generationConfig: {
        response_mime_type: "application/json",
        temperature: 0.2 // Respostas mais determinísticas
      }
    };

    const fetchRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!fetchRes.ok) {
      const errTxt = await fetchRes.text();
      console.error("Gemini Error:", errTxt);
      throw new Error("Erro na API do Gemini ao caçar oportunidades.");
    }

    const data = await fetchRes.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) throw new Error("Sem resposta válida do Gemini.");
    
    let parsed;
    try {
      parsed = JSON.parse(resultText);
    } catch(e) {
       const clean = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
       parsed = JSON.parse(clean);
    }

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("Erro Refin Hunter:", error);
    return NextResponse.json({ error: error.message || "Falha ao processar HISCON" }, { status: 500 });
  }
}
