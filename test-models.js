const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY });

async function testModel(modelId) {
  try {
    console.log(`Testando ${modelId}...`);
    const res = await ai.models.generateContent({
      model: modelId,
      contents: "Diga 'Oi' e nada mais.",
    });
    console.log(`  [OK] ${modelId}: ${res.text}`);
    return true;
  } catch (e) {
    console.log(`  [ERRO] ${modelId}: ${e.message}`);
    return false;
  }
}

async function run() {
  const models = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite-preview-02-05",
    "gemini-flash-latest"
  ];
  
  for (const m of models) {
    await testModel(m);
  }
}

run();
