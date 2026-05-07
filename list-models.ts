import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY! });

async function run() {
  console.log("Listando modelos disponíveis...\n");
  const pager = await ai.models.list({ config: { pageSize: 50 } });
  
  const modelos: string[] = [];
  for (const m of pager.page) {
    if (m.name && m.supportedActions?.includes("generateContent")) {
      modelos.push(m.name);
    }
  }
  
  modelos.sort();
  for (const m of modelos) {
    console.log(`  ✓ ${m}`);
  }
  console.log(`\nTotal: ${modelos.length} modelos com generateContent`);
}

run().catch(console.error);
