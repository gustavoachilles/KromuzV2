import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/audit";
import { getClientIP, isRateLimited } from "@/lib/rate-limit";

// POST — Ações em massa em múltiplas conversas
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const ip = getClientIP(req);
    if (isRateLimited(`${ip}:acoes-massa`, 10)) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    const { conversaIds, acao, dados } = await req.json();
    if (!Array.isArray(conversaIds) || conversaIds.length === 0 || !acao) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Limitar a 50 conversas por vez
    const ids = conversaIds.slice(0, 50);

    // Validar que todas pertencem à empresa
    const conversas = await prisma.conversa.findMany({
      where: { id: { in: ids }, empresaId: sessao.empresaId },
      select: { id: true, tags: true, clienteNome: true },
    });
    const validIds = conversas.map(c => c.id);

    if (validIds.length === 0) return NextResponse.json({ error: "Nenhuma conversa válida" }, { status: 404 });

    switch (acao) {
      case "FINALIZAR": {
        await prisma.conversa.updateMany({
          where: { id: { in: validIds } },
          data: {
            status: "FECHADO",
            finalizadoPor: sessao.email,
            finalizadoEm: new Date(),
            motivoFechamento: dados?.motivo || "Finalizado em massa",
          },
        });
        registrarAuditoria({ empresaId: sessao.empresaId, usuarioEmail: sessao.email, acao: "EDITAR", entidade: "CONVERSA", entidadeNome: `Finalizar em massa: ${validIds.length} conversas` });
        return NextResponse.json({ ok: true, afetadas: validIds.length });
      }

      case "ADD_TAG": {
        const { tag } = dados || {};
        if (!tag) return NextResponse.json({ error: "Tag obrigatória" }, { status: 400 });
        let count = 0;
        for (const conv of conversas) {
          const currentTags = conv.tags || [];
          if (!currentTags.includes(tag)) {
            await prisma.conversa.update({
              where: { id: conv.id },
              data: { tags: [...currentTags, tag] },
            });
            count++;
          }
        }
        return NextResponse.json({ ok: true, afetadas: count });
      }

      case "TRANSFERIR": {
        const { departamento } = dados || {};
        await prisma.conversa.updateMany({
          where: { id: { in: validIds } },
          data: {
            departamento: departamento || null,
            transferidoPor: sessao.email,
            status: "ABERTO",
          },
        });
        registrarAuditoria({ empresaId: sessao.empresaId, usuarioEmail: sessao.email, acao: "EDITAR", entidade: "CONVERSA", entidadeNome: `Transferir em massa: ${validIds.length} para ${departamento}` });
        return NextResponse.json({ ok: true, afetadas: validIds.length });
      }

      default:
        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }
  } catch (e) {
    console.error("Erro ações em massa:", e);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
