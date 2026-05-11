import { GoogleGenAI } from "@google/genai";
import { ExtratoHisconSchema, type ExtratoHisconRaw } from "./schema-hiscon";

export type ResultadoExtracaoHiscon =
  | { ok: true; dados: ExtratoHisconRaw; raw?: string }
  | { ok: false; erro: string; isRetryable: boolean };

const PROMPT_HISCON = `Você é um especialista em análise de Crédito Consignado (INSS).
Extraia os dados do HISCON PDF em anexo e retorne EXCLUSIVAMENTE um JSON seguindo exatamente esta estrutura:

{
  "dados_cliente": {
    "nome": "NOME COMPLETO",
    "idade": 0,
    "data_nascimento": "AAAA-MM-DD",
    "especie_beneficio": 0,
    "especie_nome": "NOME DA ESPECIE",
    "numero_beneficio": "000.000.000-0",
    "uf": "UF",
    "possui_representante_legal": false,
    "data_despacho_beneficio": "AAAA-MM-DD",
    "margens": {
      "emprestimo_livre": 0.0,
      "cartao_rmc_livre": 0.0,
      "cartao_rcc_livre": 0.0
    }
  },
  "contratos_ativos": [
    {
      "numero_contrato": "000",
      "banco_nome": "NOME DO BANCO",
      "valor_parcela": 0.0,
      "prazo_total": 0,
      "parcelas_pagas": 0,
      "data_inicio": "AAAA-MM-DD",
      "taxa_juros_mensal": 0.0,
      "saldo_devedor_estimado": 0.0
    }
  ]
}

Considere o ano atual como 2026. IMPORTANTE: 
1. Se o HISCON trouxer apenas a 'Competência de Início do Desconto' ou 'Data de Início', calcule as 'parcelas_pagas' sendo a quantidade de meses desde a Data de Início até hoje (Ex: se iniciou em 01/2025, pagou umas 16 parcelas). Nunca retorne 0 se a data de inicio for antiga.
2. Nomeie o banco QI sempre como 'QI SOCIEDADE DE CREDITO DIRETO S A'.
3. Se não houver saldo devedor, tente estimar ou extraia o 'Valor Emprestado' se disponível.
Não adicione nenhum texto antes ou depois do JSON.`;

export async function processarHisconV3(pdfBufferBase64: string): Promise<ResultadoExtracaoHiscon> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return { ok: false, erro: "API Key do Google não configurada.", isRetryable: false };
  }

  try {
    console.log("🤖 [IA] Chamando Google Generative AI (Gemini 2.5 Flash)...");
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        PROMPT_HISCON,
        {
          inlineData: {
            data: pdfBufferBase64,
            mimeType: "application/pdf"
          }
        }
      ]
    });

    const text = response.text;
    if (!text) return { ok: false, erro: "Resposta vazia do modelo.", isRetryable: true };

    try {
      // Limpeza agressiva para pegar apenas o JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Nenhum JSON encontrado na resposta");
      
      const dados = JSON.parse(jsonMatch[0]);
      return { ok: true, dados };
    } catch (e) {
      console.error("Erro ao parsear JSON da IA. Texto bruto:", text);
      return { ok: false, erro: "Falha ao processar estrutura de dados da IA.", isRetryable: true };
    }
  } catch (error: any) {
    console.error("❌ Erro na extração via Google SDK:", error);
    
    // Tentar buscar a lista de modelos para entender por que o 1.5 flash não funciona
    try {
      const ai = new GoogleGenAI({ apiKey });
      const modelsResponse = await ai.models.list();
      const modelNames = [];
      for await (const m of modelsResponse) {
        modelNames.push(m.name);
      }
      console.log("✅ MODELOS DISPONÍVEIS NA SUA API KEY:", modelNames.join(", "));
      return { 
        ok: false, 
        erro: `Erro na IA (${error.message}). Modelos disponíveis: ${modelNames.slice(0, 5).join(", ")}...`, 
        isRetryable: false 
      };
    } catch (listError) {
      console.error("Não foi possível listar os modelos:", listError);
    }

    return { ok: false, erro: error.message || "Erro desconhecido na IA.", isRetryable: true };
  }
}
