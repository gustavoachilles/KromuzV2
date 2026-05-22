import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/audit";
import { getClientIP, isRateLimited } from "@/lib/rate-limit";

// POST — Ações em conversas: finalizar, transferir, addTag, removeTag, reabrir
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

    const ip = getClientIP(req);
    if (isRateLimited(`${ip}:acoes:POST`, 60)) return NextResponse.json({ error: "Muitas requisições" }, { status: 429 });

    const { conversaId, acao, dados } = await req.json();
    if (!conversaId || !acao) return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    const ACOES_VALIDAS = ["FINALIZAR", "REABRIR", "TRANSFERIR", "ADD_TAG", "REMOVE_TAG", "ASSUMIR"];
    if (!ACOES_VALIDAS.includes(acao)) return NextResponse.json({ error: "Ação inválida" }, { status: 400 });

    const conversa = await prisma.conversa.findFirst({ where: { id: conversaId, empresaId: sessao.empresaId } });
    if (!conversa) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

    switch (acao) {
      case "FINALIZAR": {
        const updated = await prisma.conversa.update({
          where: { id: conversaId },
          data: {
            status: "FECHADO",
            finalizadoPor: sessao.email,
            finalizadoEm: new Date(),
            motivoFechamento: dados?.motivo || null,
          },
        });
        registrarAuditoria({ empresaId: sessao.empresaId, usuarioEmail: sessao.email, acao: "EDITAR", entidade: "CONVERSA", entidadeId: conversaId, entidadeNome: `Finalizar: ${conversa.clienteNome}` });
        return NextResponse.json(updated);
      }

      case "REABRIR": {
        const updated = await prisma.conversa.update({
          where: { id: conversaId },
          data: { status: "ABERTO", finalizadoPor: null, finalizadoEm: null, motivoFechamento: null },
        });
        return NextResponse.json(updated);
      }

      case "TRANSFERIR": {
        const { vendedorId, departamento } = dados || {};
        const updated = await prisma.conversa.update({
          where: { id: conversaId },
          data: {
            vendedorId: vendedorId || conversa.vendedorId,
            departamento: departamento || null,
            transferidoPor: sessao.email,
            status: "ABERTO",
          },
        });
        // Criar mensagem de sistema sobre a transferência
        await prisma.mensagem.create({
          data: {
            conversaId,
            remetente: "SISTEMA",
            tipo: "INTERNA",
            conteudo: `Conversa transferida por ${sessao.email}${departamento ? ` para ${departamento}` : ""}`,
          },
        });
        registrarAuditoria({ empresaId: sessao.empresaId, usuarioEmail: sessao.email, acao: "EDITAR", entidade: "CONVERSA", entidadeId: conversaId, entidadeNome: `Transferir: ${conversa.clienteNome}` });
        return NextResponse.json(updated);
      }

      case "ADD_TAG": {
        const { tag } = dados || {};
        if (!tag) return NextResponse.json({ error: "Tag obrigatória" }, { status: 400 });
        const currentTags = conversa.tags || [];
        if (!currentTags.includes(tag)) {
          const updated = await prisma.conversa.update({
            where: { id: conversaId },
            data: { tags: [...currentTags, tag] },
          });
          return NextResponse.json(updated);
        }
        return NextResponse.json(conversa);
      }

      case "REMOVE_TAG": {
        const { tag: tagRemove } = dados || {};
        const updated = await prisma.conversa.update({
          where: { id: conversaId },
          data: { tags: (conversa.tags || []).filter((t: string) => t !== tagRemove) },
        });
        return NextResponse.json(updated);
      }

      case "ASSUMIR": {
        const updated = await prisma.conversa.update({
          where: { id: conversaId },
          data: { status: "ABERTO", vendedorId: sessao.id },
        });
        await prisma.mensagem.create({
          data: {
            conversaId,
            remetente: "SISTEMA",
            tipo: "INTERNA",
            conteudo: `${sessao.email} assumiu o atendimento`,
          },
        });
        return NextResponse.json(updated);
      }

      default:
        return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
    }
  } catch (e) {
    console.error("Erro ação conversa:", e);
    return NextResponse.json({ error: "Erro na ação" }, { status: 500 });
  }
}
