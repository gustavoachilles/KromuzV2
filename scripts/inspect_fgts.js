const XLSX = require("xlsx");

const inputPath = "/Users/gustavoachilles/Documents/ANTIGRAVITY/KROMUZ CLAUDE V2/PLANILHAS/05-2026 FGTS.xlsx";
const wb = XLSX.readFile(inputPath);

console.log("=== ABAS ===");
console.log(wb.SheetNames);

for (const name of wb.SheetNames) {
  const ws = wb.Sheets[name];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
  console.log(`\n=== ABA: "${name}" (${data.length} linhas) ===`);
  // Show first 3 rows
  for (let i = 0; i < Math.min(3, data.length); i++) {
    console.log(`  Linha ${i}: ${JSON.stringify(data[i]?.slice(0, 12))}`);
  }
  // Find rows with data
  let nonEmpty = 0;
  for (let i = 0; i < data.length; i++) {
    if (data[i] && data[i].length > 0 && data[i][0]) nonEmpty++;
  }
  console.log(`  Linhas com dados: ${nonEmpty}`);
}
