import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { createEvolutionInstance, setEvolutionWebhook, getEvolutionQRCode } from "@/lib/evolution";

export async function POST(req: Request) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { apiUrl, apiKey, nomeCanal } = await req.json();

    if (!apiUrl || !apiKey || !nomeCanal) {
      return NextResponse.json({ error: "URL, API Key e Nome são obrigatórios." }, { status: 400 });
    }

    // 1. Criar o registro do canal no banco se não existir
    let canal = await prisma.canalComunicacao.findFirst({
      where: { 
        empresaId: sessao.empresaId,
        nomeCanal: nomeCanal
      }
    });

    const identificador = `kromuz_${sessao.empresaId.substring(0, 5)}_${nomeCanal.toLowerCase().replace(/\s/g, '_')}`;

    if (!canal) {
      canal = await prisma.canalComunicacao.create({
        data: {
          empresaId: sessao.empresaId,
          tipo: "WHATSAPP",
          nomeCanal,
          identificador,
          credenciaisApi: { apiUrl, apiKey },
          botAtivo: false,
          ativo: true
        }
      });
    } else {
      canal = await prisma.canalComunicacao.update({
        where: { id: canal.id },
        data: { credenciaisApi: { apiUrl, apiKey }, identificador }
      });
    }

    // 2. Criar instância na Evolution API
    try {
      await createEvolutionInstance(apiUrl, apiKey, identificador);
    } catch (e) {
      // Se já existir, ignoramos o erro de criação e tentamos conectar
      console.log("Instância já existe ou erro na criação:", e);
    }

    // 3. Configurar Webhook automaticamente
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sua-url-publica.com";
    const webhookUrl = `${baseUrl}/api/webhooks/evolution`;
    await setEvolutionWebhook(apiUrl, apiKey, identificador, webhookUrl);

    // 4. Buscar o QR Code para exibir no front
    const qrData = await getEvolutionQRCode(apiUrl, apiKey, identificador);

    return NextResponse.json({ 
      success: true, 
      qrcode: qrData.base64 || qrData.code,
      instance: identificador
    });

  } catch (error: any) {
    console.error("Erro ao conectar canal:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
