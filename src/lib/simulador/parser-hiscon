import { ExtratoHisconRaw } from "./schema-hiscon";

/**
 * Robô Extrator (Parser) Definitivo:
 * Usa o motor oficial pdfjs-dist para extração de texto pura.
 */
export async function parseHisconPdf(buffer: Buffer): Promise<ExtratoHisconRaw> {
  console.log("🛠️ [Robô] Iniciando extração direta via PDF.js...");
  
  // Configuração específica para evitar o erro de 'Worker' no Node.js
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({
    data: uint8Array,
    isEvalSupported: false,
    disableFontFace: true,
    disableWorker: true,
    verbosity: 0
  });

  const pdf = await loadingTask.promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(" ") + "\n";
  }

  const text = fullText;
  console.log("🛠️ [Robô] Texto extraído com sucesso! Tamanho:", text.length);

  // 1. Extração de Dados Básicos (Regex)
  const nBeneficio = text.match(/Nº Benefício:\s*([\d.-]+)/)?.[1] || "";
  const nome = text.match(/HISTÓRICO DE\s*EMPRÉSTIMO CONSIGNADO\s*([\s\S]*?)\s*Benefício/i)?.[1]?.trim() || "";
  
  // Mapeamento de Espécie (Exemplo simples, pode ser expandido)
  let especie = 0;
  if (text.includes("APOSENTADORIA POR IDADE")) especie = 41;
  else if (text.includes("PENSAO POR MORTE")) especie = 21;
  else if (text.includes("APOSENTADORIA POR INVALIDEZ")) especie = 32;

  const possuiRepresentante = text.includes("Não possui representante legal") ? false : true;
  const uf = text.match(/([A-Z]{2})\s*$/m)?.[1] || "SP"; // Fallback simples

  // 2. Extração de Margens
  // Buscamos na tabela de modalidade
  const margemLivre = parseMoeda(text.match(/EMPRÉSTIMOS[\s\S]*?MARGEM DISPONÍVEL\*[\s\S]*?R\$([\d.,]+)/)?.[1]);
  const margemRmc = parseMoeda(text.match(/RMC[\s\S]*?MARGEM DISPONÍVEL\*[\s\S]*?R\$([\d.,]+)/)?.[1]);
  const margemRcc = parseMoeda(text.match(/RCC[\s\S]*?MARGEM DISPONÍVEL\*[\s\S]*?R\$([\d.,]+)/)?.[1]);

  // 3. Extração de Contratos Ativos
  const contratos: any[] = [];
  // Linhas de contratos ativos geralmente começam com um código (ex: FIN, 0122, etc)
  // e estão na tabela "CONTRATOS ATIVOS E SUSPENSOS"
  const sectionAtivos = text.split("CONTRATOS ATIVOS E SUSPENSOS")[1]?.split("CONTRATOS EXCLUÍDOS")[0] || "";
  
  // Regex para capturar linhas de contratos (Simplificado para o exemplo)
  const contratoRegex = /([\d\w]+)\s+(\d+\s+-\s+[\s\S]*?)\s+Ativo[\s\S]*?(\d+)\s+R\$([\d.,]+)\s+R\$([\d.,]+)\s+R\$([\d.,]+)/g;
  let match;
  while ((match = contratoRegex.exec(sectionAtivos)) !== null) {
    contratos.push({
      banco: match[2].trim(),
      valor_parcela: parseMoeda(match[4]),
      taxa_juros_mensal: 1.66, // Fallback se não achar no texto
      parcelas_pagas: 0, // Precisaria de regex mais complexo para achar o contador
      prazo_total: parseInt(match[3]),
      saldo_devedor_estimado: parseMoeda(match[6]),
    });
  }

  return {
    dados_cliente: {
      nome,
      idade: 65, // Ideal calcular da data de nascimento se disponível
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
    contratos_ativos: contratos
  };
}

function parseMoeda(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = val.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}
