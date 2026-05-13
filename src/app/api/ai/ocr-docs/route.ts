import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";

export const maxDuration = 60; // OCR pode demorar

export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const { base64Image, mimeType } = await req.json();

    if (!base64Image) {
      return NextResponse.json({ error: "Imagem não fornecida." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "Chave da API Gemini não configurada." }, { status: 500 });
    }

    // Extrair o "data:image/jpeg;base64," se existir
    const b64Data = base64Image.split(",").length > 1 ? base64Image.split(",")[1] : base64Image;
    const finalMime = mimeType || (base64Image.includes("png") ? "image/png" : base64Image.includes("pdf") ? "application/pdf" : "image/jpeg");

    // Vamos usar a API REST direta do Gemini para evitar problemas de versão do SDK e dependências
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const payload = {
      contents: [{
        parts: [
          { text: `Você é um analista antifraude especialista em documentação brasileira. Analise a imagem anexa e extraia os seguintes dados em formato JSON exato, sem nenhum texto extra ao redor. O JSON deve conter:
{
  "tipoDocumento": "RG ou CNH ou Comprovante de Residência ou Outro",
  "legivel": true ou false,
  "nomeExtraido": "Nome completo",
  "cpfExtraido": "Somente números do CPF",
  "dataNascimentoExtraida": "DD/MM/AAAA",
  "observacoes": "Descreva problemas: cortado, desfocado, vencido. Se ok, escreva 'Documento válido e legível'."
}` },
          {
            inline_data: {
              mime_type: finalMime,
              data: b64Data
            }
          }
        ]
      }],
      generationConfig: {
        response_mime_type: "application/json"
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
      throw new Error("Erro na API do Gemini.");
    }

    const data = await fetchRes.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) throw new Error("Sem resposta válida do Gemini.");
    
    let parsed;
    try {
      parsed = JSON.parse(resultText);
    } catch(e) {
       // fallback if there's markdown
       const clean = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
       parsed = JSON.parse(clean);
    }

    return NextResponse.json(parsed);

  } catch (error: any) {
    console.error("Erro OCR:", error);
    return NextResponse.json({ error: error.message || "Falha ao processar OCR" }, { status: 500 });
  }
}
