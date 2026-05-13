import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { runCampaign } from "@/lib/dispatcher";

export async function POST(req: Request) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { nome, canalId, filtro, mensagem } = await req.json();

    if (!nome || !canalId || !mensagem) {
      return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
    }

    // 1. Criar Campanha no Banco
    const campanha = await prisma.campanhaDisparo.create({
      data: {
        empresaId: sessao.empresaId,
        canalId,
        nome,
        mensagemTemplate: mensagem,
        status: "AGENDADA",
        filtrosDeBase: { status: filtro === "todos" ? undefined : filtro },
        leadsAtingidos: 0
      }
    });

    // 2. Disparar processamento em background (Non-blocking)
    // No Next.js, isso continua rodando após o retorno da resposta se o processo não morrer
    runCampaign(campanha.id).catch(err => console.error("Erro no Dispatcher:", err));

    return NextResponse.json(campanha, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar campanha:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
