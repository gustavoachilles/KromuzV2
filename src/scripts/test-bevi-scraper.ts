import { scrapeBeviTabelas } from "../lib/bevi";

async function main() {
  console.log("🚀 Teste do scraper Bevi\n");
  const result = await scrapeBeviTabelas("SUB67-103060", "Justo@2024", "@Tabo201", {
    financeira: "FACTA", convenio: "INSS", formaContrato: "Novo", tipoContrato: "Novo",
  });

  console.log(`\n✅ ${result.tabelas.length} tabelas, ${result.rawData.length} raw`);
  
  // Show raw data columns to understand the mapping
  if (result.rawData.length > 0) {
    console.log("\n=== RAW DATA COLUMNS ===");
    const first = result.rawData[0];
    console.log("Keys:", Object.keys(first).join(" | "));
    console.log("\n=== FIRST 3 ROWS ===");
    result.rawData.slice(0, 3).forEach((r, i) => {
      console.log(`\n--- Row ${i+1} ---`);
      Object.entries(r).forEach(([k, v]) => console.log(`  ${k}: "${v}"`));
    });
  }

  if (result.tabelas.length > 0) {
    console.log("\n=== PARSED TABELAS (first 3) ===");
    result.tabelas.slice(0, 3).forEach((t, i) => {
      console.log(`\n--- Tabela ${i+1} ---`);
      console.log(JSON.stringify(t, null, 2));
    });
  }

  if (result.errors.length > 0) {
    console.log(`\n❌ Erros:`);
    result.errors.forEach(e => console.log(`   - ${e}`));
  }
}
main().catch(console.error);
