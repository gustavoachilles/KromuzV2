import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    const { empresaId } = sessao;

    const { textoOriginal } = await req.json();

    if (!textoOriginal || textoOriginal.trim() === "") {
      return NextResponse.json({ error: "Texto vazio" }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "API do Gemini não configurada." }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Você é um assistente de vendas de alto nível especialista em crédito consignado. 
Aja como um corretor ortográfico e um especialista em copy persuasiva.
Seu objetivo é pegar a mensagem rascunho de um vendedor, corrigir qualquer erro de português, e reescrevê-la para que soe profissional, educada e persuasiva.
A mensagem será enviada pelo WhatsApp para um cliente.
Não seja excessivamente formal a ponto de parecer um robô, mantenha um tom humano, simpático e comercial.
Se a mensagem original for muito curta (ex: "ok", "bom dia"), apenas corrija a gramática e pontuação se necessário, não invente um texto longo do nada.

Texto original do vendedor:
"${textoOriginal}"

Retorne APENAS o texto reescrito, sem aspas, sem introduções como "Aqui está o texto melhorado:".`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textoMelhorado = response.text().trim();

    return NextResponse.json({ textoMelhorado });

  } catch (error: any) {
    console.error("Erro na IA Corretora:", error);
    return NextResponse.json({ error: "Erro ao processar texto com a IA." }, { status: 500 });
  }
}
