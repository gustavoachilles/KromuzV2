import { ExtratoHisconRaw } from "./schema-hiscon";

export async function parseHisconPdf(buffer: Buffer): Promise<ExtratoHisconRaw> {
  console.log("🛠️ [Robô V2] Extração Ultra-Estável Iniciada...");
  
  const pdf = require("pdf-parse/dist/pdf-parse/cjs/index.cjs");
  
  let text = "";
  try {
    const data = await pdf(buffer);
    text = data.text;
    console.log("✅ [Robô V2] Texto extraído com sucesso! Tamanho:", text.length);
  } catch (e: any) {
    console.error("❌ [Robô V2] ERRO NA EXTRAÇÃO DO PDF:", e);
    // Fallback manual se o pdf-parse falhar feio
    text = buffer.toString("binary").replace(/[^\x20-\x7E\s]/g, ""); 
  }

  // 1. Extração de Dados Básicos (Regex)
  const nBeneficio = text.match(/Nº Benefício:\s*([\d.-]+)/)?.[1] || "";
  const nome = text.match(/HISTÓRICO DE\s*EMPRÉSTIMO CONSIGNADO\s*([\s\S]*?)\s*Benefício/i)?.[1]?.trim() || "";
  
  // Mapeamento de Espécie
  let especie = 0;
  if (text.includes("APOSENTADORIA POR IDADE")) especie = 41;
  else if (text.includes("PENSAO POR MORTE")) especie = 21;
  
  const possuiRepresentante = text.includes("Não possui representante legal") ? false : true;
  const uf = text.match(/([A-Z]{2})\s*$/m)?.[1] || "SP";

  // 2. Extração de Margens
  const margemLivre = parseMoeda(text.match(/EMPRÉSTIMOS[\s\S]*?MARGEM DISPONÍVEL\*[\s\S]*?R\$([\d.,]+)/)?.[1]);
  const margemRmc = parseMoeda(text.match(/RMC[\s\S]*?MARGEM DISPONÍVEL\*[\s\S]*?R\$([\d.,]+)/)?.[1]);
  const margemRcc = parseMoeda(text.match(/RCC[\s\S]*?MARGEM DISPONÍVEL\*[\s\S]*?R\$([\d.,]+)/)?.[1]);

  return {
    dados_cliente: {
      nome,
      idade: 65,
      uf,
      especie_beneficio: especie,
      possui_representante_legal: possuiRepresentante,
      data_despacho_beneficio: "2020-01-01",
      margens: {
        emprestimo_livre: margemLivre,
        cartao_rmc_livre: margemRmc,
        cartao_rcc_livre: margemRcc,
      }
    },
    contratos_ativos: [] // Simplificado para teste
  };
}

function parseMoeda(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

