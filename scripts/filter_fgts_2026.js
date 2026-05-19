const XLSX = require("xlsx");

const inputPath = "/Users/gustavoachilles/Documents/ANTIGRAVITY/KROMUZ CLAUDE V2/PLANILHAS/05-2026 FGTS.xlsx";
const outputPath = "/Users/gustavoachilles/Documents/ANTIGRAVITY/KROMUZ CLAUDE V2/PLANILHAS/FGTS_2026.xlsx";

const wb = XLSX.readFile(inputPath);
const ws = wb.Sheets["06-2025"]; // aba com os dados
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

const header = data[0]; // ["Nome","CPF","Data Digitação","ADE",...]
const dateIdx = 2; // "Data Digitação"

console.log("Total linhas:", data.length - 1);
console.log("Header:", header.join(" | "));

// Jan 1, 2026 como serial Excel = 46023
const SERIAL_JAN_2026 = 46023;

const out = [header];
let kept = 0, skip = 0;

for (let i = 1; i < data.length; i++) {
  const r = data[i];
  if (!r || !r.length || !r[0]) continue;

  const dv = r[dateIdx];
  const serial = Number(dv);

  if (!dv || isNaN(serial)) {
    // Sem data = incluir
    out.push(r);
    kept++;
  } else if (serial >= SERIAL_JAN_2026) {
    // 2026+
    out.push(r);
    kept++;
  } else {
    skip++;
  }
}

console.log("\n2026 (mantidos):", kept);
console.log("2025 ou antes (excluídos):", skip);

const nws = XLSX.utils.aoa_to_sheet(out);
const nwb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(nwb, nws, "FGTS 2026");
XLSX.writeFile(nwb, outputPath);
console.log("\nSalvo:", outputPath);
