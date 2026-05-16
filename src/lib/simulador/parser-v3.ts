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

  // Tenta formato tabular: MARGEM DISPONÍVEL seguido de valores
  const margemSection = flat.match(/MARGEM DISPON[IÍ]VEL\*?\s*R\$([\d.,]+)/i);
  if (margemSection) {
    margemLivre = parseMoeda(margemSection[1]);
    console.log(`✅ [Robô V3] Margem empréstimo: R$ ${margemLivre}`);
  }

  // Tenta formato alternativo
  if (margemLivre === 0) {
    const alt = flat.match(/Margem\s+consign[aá]vel\s+dispon[ií]vel.*?R\$([\d.,]+)/i);
    if (alt) margemLivre = parseMoeda(alt[1]);
  }
  if (margemLivre === 0) {
    const alt = flat.match(/35%.*?Empr[eé]stimo.*?R\$([\d.,]+)/i);
    if (alt) margemLivre = parseMoeda(alt[1]);
  }

  // RMC/RCC - procura após a seção de margem
  const rccMatch = flat.match(/RCC.*?R\$([\d.,]+).*?R\$([\d.,]+)/i);
  // Não extraímos RMC/RCC aqui pois o formato é ambíguo

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
    const bankPattern = /(\d{3})\s*-\s*((?:[A-ZÀ-Ú\s]+?)+?)\s+(\d{2}\/\d{4})\s+(\d{2}\/\d{4})\s+(\d{2,3})\s+R\$([\d.,]+)\s+R\$([\d.,]+)/g;
    let m;

    while ((m = bankPattern.exec(secContratos)) !== null) {
      const bancoCode = m[1];
      let bancoNome = m[2].trim().replace(/\s+/g, ' ');
      const dataInicio = m[3]; // MM/YYYY
      const dataFim = m[4];
      const parcelas = parseInt(m[5]);
      const valorParcela = parseMoeda(m[6]);
      const valorEmprestado = parseMoeda(m[7]);

      // Procura taxa de juros mensal após este match (padrão: 1,XX entre 1.0 e 3.0)
      const afterMatch = secContratos.substring(m.index + m[0].length, m.index + m[0].length + 300);
      const taxaMatch = afterMatch.match(/(\d,\d{2})\s+\d{2,3},\d{2}\s+(\d,\d{2})\s+\d{2,3},\d{2}/);
      let taxa = 1.66; // default
      if (taxaMatch) {
        // O padrão é: CET_MENSAL CET_ANUAL TAXA_MENSAL TAXA_ANUAL
        taxa = parseMoeda(taxaMatch[2]) || 1.66;
      } else {
        // Fallback: procura qualquer 1,XX
        const taxaSimples = afterMatch.match(/\b(1,\d{2})\b/);
        if (taxaSimples) taxa = parseMoeda(taxaSimples[1]);
      }

      // Calcula parcelas pagas
      const [mesInicio, anoInicio] = dataInicio.split('/').map(Number);
      const agora = new Date();
      const parcelasPagas = Math.max(0, (agora.getFullYear() - anoInicio) * 12 + (agora.getMonth() + 1 - mesInicio));

      // Estima saldo devedor
      const saldoEstimado = valorParcela * Math.max(0, parcelas - parcelasPagas);

      // Normaliza nome do banco
      if (bancoNome.includes("QI") || bancoNome.includes("CREDITO DIRETO")) {
        bancoNome = "QI SOCIEDADE DE CREDITO DIRETO S A";
      }

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

      let bancoNome = bancoM[2].trim().replace(/\s+/g, ' ');
      if (bancoNome.includes("QI") || bancoNome.includes("CREDITO DIRETO"))
        bancoNome = "QI SOCIEDADE DE CREDITO DIRETO S A";

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
          saldo_devedor_estimado: valorParcela * Math.max(0, parcelas - pp),
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
