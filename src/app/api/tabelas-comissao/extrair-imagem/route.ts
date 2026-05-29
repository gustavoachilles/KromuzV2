import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";

/**
 * POST /api/tabelas-comissao/extrair-imagem
 * Recebe uma imagem (base64) e usa IA para extrair as linhas da tabela de comissão.
 */
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const body = await req.json();
  const { imageBase64, mimeType } = body;

  if (!imageBase64) {
    return NextResponse.json({ error: "Imagem não fornecida" }, { status: 400 });
  }

  // Usar Google Gemini para OCR da tabela
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_GENERATIVE_AI_API_KEY não configurada" }, { status: 500 });
  }

  try {
    const prompt = `Você é um especialista em tabelas de comissão bancária/consignado.

Analise esta imagem de tabela de comissão e extraia TODAS as linhas em formato JSON.

Para CADA linha da tabela, extraia:
- "tabela": nome completo da tabela (ex: "FACTA INSS PORT TAB 1 DIG 84X")
- "codigo_banco": código numérico do banco se visível (ex: "4397")
- "codigo_tabela": código da tabela se visível (ex: "TAB001")
- "taxa_juros": taxa de juros mensal como número decimal (ex: 1.85)
- "prazo_minimo": prazo mínimo em meses (ex: 12)
- "prazo_maximo": prazo máximo em meses (ex: 84)
- "percentual_comissao": percentual de comissão como número (ex: 8.5)
- "coeficiente": coeficiente se visível (ex: 0.02234)
- "data_alteracao": data de alteração se visível

Também identifique no cabeçalho/contexto da imagem:
- "banco": nome do banco financeiro (ex: "Facta", "BMG", "Daycoval")
- "convenio": convênio (ex: "INSS", "SIAPE", "FGTS")
- "produto": tipo de produto (ex: "portabilidade", "consignado_inss", "refinanciamento")
- "confianca": nível de confiança de 0 a 100

Retorne APENAS o JSON válido, sem texto extra, no formato:
{
  "banco": "...",
  "convenio": "...",
  "produto": "...",
  "confianca": 85,
  "itens": [
    { "tabela": "...", "taxa_juros": 1.85, "prazo_maximo": 84, "percentual_comissao": 8.5, ... },
    ...
  ]
}`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType || "image/jpeg",
                    data: imageBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("[extrair-imagem] Gemini error:", errText);
      return NextResponse.json({ error: "Erro na API de IA" }, { status: 500 });
    }

    const geminiData = await geminiResponse.json();
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON da resposta
    let dados;
    try {
      dados = JSON.parse(textContent);
    } catch {
      // Tentar extrair JSON de dentro do texto
      const match = textContent.match(/\{[\s\S]*\}/);
      if (match) {
        dados = JSON.parse(match[0]);
      } else {
        return NextResponse.json({ error: "IA não retornou JSON válido", raw: textContent }, { status: 422 });
      }
    }

    return NextResponse.json({
      success: true,
      dados: {
        banco: dados.banco || "",
        convenio: dados.convenio || "",
        produto: dados.produto || "",
        confianca: dados.confianca || 0,
        total_linhas_detectadas_ocr: dados.itens?.length || 0,
        total_linhas_convertidas: dados.itens?.filter((i: any) => i.tabela)?.length || 0,
        itens: dados.itens || [],
      },
    });
  } catch (e: any) {
    console.error("[extrair-imagem] Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
