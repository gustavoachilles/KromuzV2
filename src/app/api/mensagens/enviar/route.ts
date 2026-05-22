import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";
import { sendEvolutionText } from "@/lib/evolution";
import { getClientIP, isRateLimited } from "@/lib/rate-limit";
import { sanitizar } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao?.empresaId) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const ip = getClientIP(req);
    if (isRateLimited(`${ip}:msg:enviar`, 60)) return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

    const { conversaId, conteudo, tipo, agendadoPara } = await req.json();

    if (!conversaId || !conteudo) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const conversa = await prisma.conversa.findUnique({
      where: { id: conversaId },
      include: { canal: true }
    });

    if (!conversa || conversa.empresaId !== sessao.empresaId) {
      return NextResponse.json({ error: "Conversa not found" }, { status: 404 });
    }

    const conteudoSanitizado = sanitizar(conteudo, 5000);
    const tipoMsg = tipo === "INTERNA" ? "INTERNA" : "WHATSAPP";

    // 1. Salva a mensagem no banco
    const mensagem = await prisma.mensagem.create({
      data: {
        conversaId,
        remetente: tipoMsg === "INTERNA" ? "VENDEDOR" : "VENDEDOR",
        tipo: tipoMsg,
        conteudo: conteudoSanitizado,
        tipoConteudo: "TEXTO",
        agendadoPara: agendadoPara ? new Date(agendadoPara) : null,
      }
    });

    // 2. Envia via Evolution API (somente se NÃO for nota interna e NÃO for agendada)
    if (tipoMsg !== "INTERNA" && !agendadoPara) {
      const credenciais = conversa.canal.credenciaisApi as { apiUrl?: string, apiKey?: string };
      
      if (credenciais?.apiUrl && credenciais?.apiKey) {
        try {
          await sendEvolutionText(
            credenciais.apiUrl,
            credenciais.apiKey,
            conversa.canal.identificador as string,
            conversa.clienteContato,
            conteudoSanitizado
          );
        } catch (evoErr) {
          console.error("Erro ao enviar pelo Evolution, mas mensagem foi salva no banco.", evoErr);
        }
      }
    }

    // 3. Atualiza a última mensagem da conversa
    await prisma.conversa.update({
      where: { id: conversaId },
      data: { 
        ultimaMensagem: tipoMsg === "INTERNA" ? `[NOTA] ${conteudoSanitizado.substring(0, 100)}` : conteudoSanitizado.substring(0, 200),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, mensagem });
  } catch (error: any) {
    console.error("Erro ao enviar mensagem:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
