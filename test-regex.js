const fs = require('fs');
const pdfParse = require('pdf-parse');

async function run() {
  const buf = fs.readFileSync('/Users/gustavoachilles/Documents/ANTIGRAVITY/KROMUZ CLAUDE V2/Material de apoio regras roteiros/CONTRATOS REAIS/CONTRATO TROCO 6557 - MPPLPRPS_830653455.pdf');
  const data = await pdfParse(buf);
  console.log("=== HEAD ===");
  console.log(data.text.substring(0, 1000));
  
  const sectionAtivos = data.text.split(/CONTRATOS ATIVOS E SUSPENSOS/i)[1]?.split(/CONTRATOS EXCLUÍDOS/i)[0] || data.text;
  console.log('Section Ativos Length:', sectionAtivos.length);
  
  const contratoRegex = /([\d\w]+)\s+(\d+\s+-\s+[^\n]+)\s+Ativo[\s\S]*?(\d+)\s+R\$([\d.,]+)[\s\S]*?R\$([\d.,]+)/gi;
  const matches = [...sectionAtivos.matchAll(contratoRegex)];
  console.log('Found contracts:', matches.length);
}

run().catch(console.error);
