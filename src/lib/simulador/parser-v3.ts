import { ExtratoHisconRaw } from "./schema-hiscon";

export async function parseHisconPdf(buffer: Buffer): Promise<ExtratoHisconRaw> {
  console.log("🛠️ [Robô V3] Modo de Passagem Direta Ativado (Bypassing local parser)...");
  
  // Retornamos um erro proposital para que o route.ts acione o fallback da IA do Google imediatamente
  // sem tentar carregar bibliotecas problemáticas localmente.
  throw new Error("LOCAL_PARSER_BYPASS");
}
