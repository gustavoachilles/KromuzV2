import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt, maskPassword } from "@/lib/crypto";
import { getSessionEmpresaApi } from "@/lib/session";

/**
 * GET /api/sync-tabelas/config
 * Retorna configuração de sync do tenant (senhas mascaradas)
 */
export async function GET() {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const config = await prisma.syncTabelaConfig.findUnique({
      where: { empresaId: sessao.empresaId },
      include: {
        historico: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!config) {
      return NextResponse.json({ configured: false, config: null, historico: [] });
    }

    // Decrypt login for display (keep passwords masked)
    let loginDecrypted = "";
    try { loginDecrypted = decrypt(config.loginBevi); } catch { loginDecrypted = config.loginBevi; }

    return NextResponse.json({
      configured: true,
      config: {
        id: config.id,
        loginBevi: loginDecrypted,
        senhaBevi: maskPassword("senha"),
        senhaRelatorio: maskPassword("senha"),
        bancosSelecionados: config.bancosSelecionados,
        ultimaSync: config.ultimaSync,
        statusSync: config.statusSync,
        erroSync: config.erroSync,
        syncAutomatico: config.syncAutomatico,
        horarioSync: config.horarioSync,
      },
      historico: config.historico,
    });
  } catch (error) {
    console.error("[SyncConfig GET]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * POST /api/sync-tabelas/config
 * Salva/atualiza configuração de sync
 */
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const body = await req.json();
    const { loginBevi, senhaBevi, senhaRelatorio, bancosSelecionados, syncAutomatico, horarioSync } = body;

    if (!loginBevi) {
      return NextResponse.json({ error: "Login Bevi obrigatório" }, { status: 400 });
    }

    const existing = await prisma.syncTabelaConfig.findUnique({ where: { empresaId: sessao.empresaId } });

    const data: Record<string, unknown> = {
      loginBevi: encrypt(loginBevi),
      bancosSelecionados: bancosSelecionados || [],
      syncAutomatico: syncAutomatico ?? false,
      horarioSync: horarioSync || "06:00",
    };

    // Only update passwords if provided (not masked)
    if (senhaBevi && !senhaBevi.includes("••")) {
      data.senhaBevi = encrypt(senhaBevi);
    }
    if (senhaRelatorio && !senhaRelatorio.includes("••")) {
      data.senhaRelatorio = encrypt(senhaRelatorio);
    }

    if (existing) {
      if (!data.senhaBevi) data.senhaBevi = existing.senhaBevi;
      if (!data.senhaRelatorio) data.senhaRelatorio = existing.senhaRelatorio;

      await prisma.syncTabelaConfig.update({
        where: { empresaId: sessao.empresaId },
        data,
      });
    } else {
      if (!senhaBevi || !senhaRelatorio) {
        return NextResponse.json({ error: "Senhas obrigatórias na primeira configuração" }, { status: 400 });
      }
      await prisma.syncTabelaConfig.create({
        data: { empresaId: sessao.empresaId, ...data } as any,
      });
    }

    return NextResponse.json({ success: true, message: "Configuração salva" });
  } catch (error) {
    console.error("[SyncConfig POST]", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
