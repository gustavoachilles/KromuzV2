import { GoogleGenAI } from "@google/genai";
import { ExtratoHisconSchema, type ExtratoHisconRaw } from "./schema-hiscon";

export type ResultadoExtracaoHiscon =
  | { ok: true; dados: ExtratoHisconRaw; raw?: string }
  | { ok: false; erro: string; isRetryable: boolean };

const PROMPT_HISCON = `Você é um especialista em análise de Crédito Consignado (INSS).
Extraia os dados do HISCON PDF em anexo.

COMO O SEU CÉREBRO FUNCIONA (OBRIGATÓRIO):
Para não errar nos cálculos matemáticos (como calcular as parcelas pagas baseadas na data de início), você DEVE obrigatoriamente iniciar sua resposta com uma tag <analise>.
Dentro da tag, você vai detalhar seu raciocínio passo a passo: "Contrato X começou em 01/2025. Estamos em maio de 2026. Logo, pagou 16 parcelas".
Somente APÓS fechar a tag </analise>, retorne EXCLUSIVAMENTE o JSON estruturado.

SEÇÕES DO HISCON QUE VOCÊ DEVE EXTRAIR:

1. DADOS DO BENEFÍCIO: Nome, número do benefício, espécie, UF, data de despacho.

2. DADOS DO PAGAMENTO (OBRIGATÓRIO):
   Procure a seção que mostra onde o benefício é pago:
   - "Pago em:" → Nome do banco (ex: CAIXA ECONOMICA FEDERAL)
   - "Meio:" → Conta Corrente ou Conta Poupança
   - "Agência:" → Número da agência
   - "Conta Corrente:" ou "Conta Poupança:" → Número da conta

3. VALORES DO BENEFÍCIO (OBRIGATÓRIO):
   Procure a tabela "VALORES DO BENEFÍCIO":
   - "BASE DE CÁLCULO" → Valor em R$ (este é a renda do cliente)
   - "MARGEM EXTRAPOLADA***" → Valor em R$ (quando total comprometido > máximo permitido)

4. MARGEM CONSIGNÁVEL (SEÇÃO CRÍTICA - NÃO PULE):
   O HISCON tem uma seção chamada "Margem Consignável" ou "EMPRÉSTIMOS / RMC / RCC".
   Para CADA tipo (Empréstimo 35%, Cartão RMC 5%, Cartão RCC 5%), procure:
   - "MARGEM DISPONÍVEL" ou "Margem consignável disponível"
   - O valor aparece como "R$ XXX,XX"
   - Se disser "MARGEM DISPONÍVEL* R$ 250,00", o emprestimo_livre é 250.00
   - Se disser "MARGEM DISPONÍVEL* R$ 0,00", o valor é 0.00
   - IMPORTANTE: Nunca retorne 0 sem verificar. Se não encontrar a seção, diga 0, mas na <analise> explique por quê.

5. CONTRATOS ATIVOS: Lista de contratos com banco, parcela, prazo, data início.

ESTRUTURA OBRIGATÓRIA DO JSON (logo após fechar a tag de análise):
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
    "banco_pagamento": "NOME DO BANCO",
    "meio_pagamento": "Conta Corrente",
    "agencia_pagamento": "0000",
    "conta_pagamento": "0000000000",
    "base_calculo": 0.00,
    "margens": {
      "emprestimo_livre": 0.0,
      "cartao_rmc_livre": 0.0,
      "cartao_rcc_livre": 0.0,
      "margem_extrapolada": 0.0
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

Considere o ano atual como 2026 (Mês atual: Junho de 2026). IMPORTANTE: 
1. Use o bloco <analise> para calcular as 'parcelas_pagas' (quantidade de meses desde a Data de Início até junho de 2026).
2. Nomeie o banco QI sempre como 'QI SOCIEDADE DE CREDITO DIRETO S A'.
3. Use o bloco <analise> para estimar o saldo devedor se não estiver explícito.
4. Na <analise>, SEMPRE descreva o valor de margem encontrado: "Margem empréstimo: R$ XXX,XX".
5. EXTRAIA o banco/agência/conta de pagamento e a base de cálculo — são dados essenciais.
6. Se houver MARGEM EXTRAPOLADA, registre o valor. Se não houver, coloque 0.
Nunca escreva nada após o final do JSON.`;

export async function processarHisconV3(pdfBufferBase64: string): Promise<ResultadoExtracaoHiscon> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return { ok: false, erro: "API Key do Google não configurada.", isRetryable: false };
  }

  try {
    console.log("🤖 [IA] Chamando Google Generative AI (Gemini 2.5 Flash)...");
    const ai = new GoogleGenAI({ apiKey });

    // Timeout de 20s para não travar a rota toda
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          PROMPT_HISCON,
          {
            inlineData: {
              data: pdfBufferBase64,
              mimeType: "application/pdf"
            }
          }
        ],
        config: {
          abortSignal: controller.signal
        }
      });
    } finally {
      clearTimeout(timeout);
    }

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
    
    const isAbort = error.name === "AbortError" || error.message?.includes("abort");
    if (isAbort) {
      return { ok: false, erro: "IA demorou demais para processar o PDF. Tente um arquivo menor.", isRetryable: false };
    }

    return { ok: false, erro: error.message || "Erro desconhecido na IA.", isRetryable: true };
  }
}
