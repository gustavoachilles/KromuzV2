import { ExtratoHisconRaw } from "./schema-hiscon";
// @ts-ignore
import pdfParse from "pdf-parse";

/**
 * Parser HISCON V3 - Reescrito para formato real do INSS (Maio/2026)
 * Extrai dados do HISCON usando regex sobre texto normalizado.
 */
export async function parseHisconPdf(buffer: Buffer): Promise<ExtratoHisconRaw> {
  console.log("🛠️ [Robô V3] Iniciando leitura local do PDF...");

  if (typeof globalThis.DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = class DOMMatrix {
      a=1; b=0; c=0; d=1; e=0; f=0;
      constructor() {}
    };
  }

  const pdf: any = (pdfParse as any).default || pdfParse;
  const data = await pdf(buffer);
  const raw: string = data.text || "";

  // Normaliza: junta linhas quebradas do PDF
  const text = raw.replace(/\n+/g, '\n');
  const flat = raw.replace(/\n/g, ' ').replace(/\s+/g, ' ');

  console.log(`📄 [Robô V3] Texto total: ${raw.length} chars`);

  // === 1. DADOS BÁSICOS ===
  const nBeneficio = raw.match(/Nº Benefício:\s*([\d.-]+)/)?.[1] || "000.000.000-0";
  let nome = raw.match(/CONSIGNADO\s*\n\s*([A-ZÀ-Ú\s]+)\n/)?.[1]?.trim() || "Cliente";
  const uf = raw.match(/UF:\s*([A-Z]{2})/i)?.[1] || flat.match(/Pago em:.*?([A-Z]{2})\s/)?.[1] || "SP";

  let especie = 41;
  if (/APOSENTADORIA POR IDADE/i.test(flat)) especie = 41;
  else if (/PENSAO POR MORTE|PENSÃO POR MORTE/i.test(flat)) especie = 21;
  else if (/APOSENTADORIA POR INVALIDEZ/i.test(flat)) especie = 32;
  else if (/APOSENTADORIA POR TEMPO/i.test(flat)) especie = 42;

  const possuiRepresentante = /possui representante legal/i.test(flat) && !/Não possui representante/i.test(flat);

  // === 2. MARGENS ===
  // Formato HISCON: "EMPRÉSTIMOS\nRMC\nRCC\nR$567,35\nR$0,05\nR$81,05\n..."
  // Ou: "MARGEM DISPONÍVEL*\nR$0,00"
  let margemLivre = 0, margemRmc = 0, margemRcc = 0;
  let margemFound = false;

  // Padrão principal: MARGEM DISPONÍVEL seguido de R$ valor
  const margemSection = flat.match(/MARGEM DISPON[IÍ]VEL\*?\s*R\$([\d.,]+)/i);
  if (margemSection) {
    margemLivre = parseMoeda(margemSection[1]);
    margemFound = true; // NÃO tentar alternativas — este é o valor correto
    console.log(`✅ [Robô V3] Margem empréstimo: R$ ${margemLivre} (via MARGEM DISPONÍVEL)`);
  }

  // Alternativas SÓ se MARGEM DISPONÍVEL não existir no texto
  if (!margemFound) {
    const alt = flat.match(/Margem\s+consign[aá]vel\s+dispon[ií]vel.*?R\$([\d.,]+)/i);
    if (alt) { margemLivre = parseMoeda(alt[1]); margemFound = true; }
  }

  console.log(`📊 [Robô V3] Margens: Livre=${margemLivre}, RMC=${margemRmc}, RCC=${margemRcc}`);

  // === 3. CONTRATOS ATIVOS ===
  const contratos: any[] = [];

  // Estratégia: encontrar blocos com banco + datas + valores no texto normalizado
  // Padrão: "CODIGO - NOME BANCO ... MM/YYYY ... MM/YYYY ... NN ... R$XX,XX ... Ativo ... TAXA"

  // Primeiro, isolar a seção de contratos
  const secContratos = flat.split(/CONTRATOS ATIVOS E SUSPENSOS/i)[1]?.split(/CONTRATOS EXCLU[IÍ]DOS/i)[0] || "";

  if (secContratos) {
    // Encontra todos os blocos "Ativo" com dados ao redor
    // Regex: captura banco (3 dígitos - NOME), datas MM/YYYY, parcelas, R$ valores, taxa
    const bankPattern = /(\d{3})\s*-\s*((?:[A-ZÀ-Ú0-9\s]+?)+?)\s+(\d{2}\/\d{4})\s+(\d{2}\/\d{4})\s+(\d{2,3})\s+R\$([\d.,]+)\s+R\$([\d.,]+)/g;
    let m;

    while ((m = bankPattern.exec(secContratos)) !== null) {
      const bancoCode = m[1];
      let bancoNome = m[2].trim().replace(/\s+/g, ' ');
      const dataInicio = m[3]; // MM/YYYY
      const dataFim = m[4];
      const parcelas = parseInt(m[5]);
      const valorParcela = parseMoeda(m[6]);
      const valorEmprestado = parseMoeda(m[7]);

      // Procura taxa de juros mensal após este match
      // Formato HISCON: ... CET_MENSAL CET_ANUAL TAXA_JUROS_MENSAL TAXA_JUROS_ANUAL ...
      // Ex: "2,48 34,26 1,79 23,87" ou "1,85 24,60"
      const afterMatch = secContratos.substring(m.index + m[0].length, m.index + m[0].length + 500);
      let taxa = 1.66; // default
      // Procura padrão: X,XX XX,XX X,XX XX,XX (CET_M CET_A TAXA_M TAXA_A)
      const taxaPattern = afterMatch.match(/(\d,\d{2})\s+(\d{2},\d{2})\s+(\d,\d{2})\s+(\d{2},\d{2})/);
      if (taxaPattern) {
        taxa = parseMoeda(taxaPattern[3]); // 3rd group = TAXA JUROS MENSAL
        console.log(`💰 [Robô V3] Taxa encontrada: ${taxa}% (padrão CET/TAXA)`);
      } else {
        // Fallback: procura "1,XX" que NÃO está dentro de "R$"
        const allTaxas = [...afterMatch.matchAll(/(?<!R\$|\d)(\d,\d{2})(?=\s)/g)];
        for (const t of allTaxas) {
          const v = parseMoeda(t[1]);
          if (v >= 1.0 && v <= 3.0) { taxa = v; break; }
        }
      }

      // Calcula parcelas pagas
      const [mesInicio, anoInicio] = dataInicio.split('/').map(Number);
      const agora = new Date();
      const parcelasPagas = Math.max(0, (agora.getFullYear() - anoInicio) * 12 + (agora.getMonth() + 1 - mesInicio));

      // Estima saldo devedor usando fórmula de valor presente (como Promosys)
      // SD = P × [(1 - (1+i)^-n) / i]  onde i = taxa/100, n = parcelas restantes
      const n = Math.max(0, parcelas - parcelasPagas);
      const i = taxa / 100;
      const saldoEstimado = i > 0 && n > 0
        ? valorParcela * ((1 - Math.pow(1 + i, -n)) / i)
        : valorParcela * n;

      // Normaliza nome do banco (pdf-parse quebra nomes em linhas)
      bancoNome = normalizarBanco(bancoNome);

      contratos.push({
        numero_contrato: `${bancoCode}-${contratos.length}`,
        banco_nome: bancoNome,
        valor_parcela: valorParcela,
        taxa_juros_mensal: taxa,
        parcelas_pagas: Math.min(parcelasPagas, parcelas),
        prazo_total: parcelas,
        saldo_devedor_estimado: saldoEstimado,
        data_inicio: `${anoInicio}-${String(mesInicio).padStart(2, '0')}-01`
      });
    }
  }

  // Fallback: se regex complexo falhou, tenta abordagem por "Ativo"
  if (contratos.length === 0 && secContratos) {
    console.log("⚠️ [Robô V3] Regex primário falhou, tentando fallback por 'Ativo'...");

    // Encontra todos R$ valores seguidos de "Ativo"
    const ativoBlocks = secContratos.split(/Ativo/i);
    for (let i = 0; i < ativoBlocks.length - 1; i++) {
      const block = ativoBlocks[i];
      // Extrai banco (3 dígitos - NOME)
      const bancoM = block.match(/(\d{3})\s*-\s*([A-ZÀ-Ú][A-ZÀ-Ú\s]*)/);
      if (!bancoM) continue;

      let bancoNome = normalizarBanco(bancoM[2].trim());

      // Extrai datas MM/YYYY
      const datas = [...block.matchAll(/(\d{2})\/(\d{4})/g)];
      const dataInicio = datas.length >= 1 ? datas[0] : null;

      // Extrai parcelas (número entre 12 e 120)
      const parcelasM = block.match(/\b(1[2-9]|[2-9]\d|1[01]\d|120)\b/);
      const parcelas = parcelasM ? parseInt(parcelasM[1]) : 84;

      // Extrai valor parcela (primeiro R$ antes de "Ativo")
      const valoresR = [...block.matchAll(/R\$([\d.,]+)/g)];
      const valorParcela = valoresR.length > 0 ? parseMoeda(valoresR[valoresR.length >= 3 ? valoresR.length - 3 : 0][1]) : 0;

      // Extrai taxa após "Ativo"
      const afterBlock = ativoBlocks[i + 1]?.substring(0, 200) || "";
      const taxaM = afterBlock.match(/\b(1,\d{2})\b/);
      const taxa = taxaM ? parseMoeda(taxaM[1]) : 1.66;

      if (valorParcela > 0) {
        const mesInicio = dataInicio ? parseInt(dataInicio[1]) : 1;
        const anoInicio = dataInicio ? parseInt(dataInicio[2]) : 2024;
        const agora = new Date();
        const pp = Math.max(0, (agora.getFullYear() - anoInicio) * 12 + (agora.getMonth() + 1 - mesInicio));

        contratos.push({
          numero_contrato: `${bancoM[1]}-${i}`,
          banco_nome: bancoNome,
          valor_parcela: valorParcela,
          taxa_juros_mensal: taxa,
          parcelas_pagas: Math.min(pp, parcelas),
          prazo_total: parcelas,
          saldo_devedor_estimado: (() => { const nn = Math.max(0, parcelas - pp); const ii = taxa / 100; return ii > 0 && nn > 0 ? valorParcela * ((1 - Math.pow(1 + ii, -nn)) / ii) : valorParcela * nn; })(),
          data_inicio: `${anoInicio}-${String(mesInicio).padStart(2, '0')}-01`
        });
      }
    }
  }

  console.log(`✅ [Robô V3] Extração concluída! ${contratos.length} contratos encontrados.`);

  return {
    dados_cliente: {
      nome,
      idade: 60,
      data_nascimento: "1960-01-01",
      uf,
      especie_beneficio: especie,
      especie_nome: `Espécie ${especie}`,
      numero_beneficio: nBeneficio,
      possui_representante_legal: possuiRepresentante,
      data_despacho_beneficio: "2015-01-01",
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

/** Normaliza nomes de banco quebrados pelo pdf-parse */
function normalizarBanco(nome: string): string {
  const n = nome.replace(/\s+/g, ' ').trim().toUpperCase();
  const map: Record<string, string> = {
    "QI": "QI SOCIEDADE DE CREDITO DIRETO S A",
    "CREDITO DIRETO": "QI SOCIEDADE DE CREDITO DIRETO S A",
    "INBURS": "BANCO INBURSA SA",
    "BRADE": "BANCO BRADESCO SA",
    "BRADESCO": "BANCO BRADESCO SA",
    "C6 CONSIG": "BANCO C6 CONSIGNADO SA",
    "C6": "BANCO C6 CONSIGNADO SA",
    "FACTA": "FACTA FINANCEIRA SA",
    "FINANC": "FACTA FINANCEIRA SA",
    "PAN": "BANCO PAN SA",
    "DAYCOVAL": "BANCO DAYCOVAL SA",
    "BMG": "BANCO BMG SA",
    "SAFRA": "BANCO SAFRA SA",
    "ITAU": "BANCO ITAU SA",
    "BANRISUL": "BANCO BANRISUL SA",
    "CAIXA": "CAIXA ECONOMICA FEDERAL",
    "CETELEM": "CETELEM SA",
    "OLE": "OLE CONSIGNADO SA",
    "MERCANTIL": "BANCO MERCANTIL DO BRASIL SA",
    "AGIBANK": "AGIBANK SA",
  };
  for (const [key, val] of Object.entries(map)) {
    if (n.includes(key)) return val;
  }
  return n;
}
