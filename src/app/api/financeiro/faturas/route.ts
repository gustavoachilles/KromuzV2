import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";
import { z } from "zod";

const postSchema = z.object({
  bancoNome: z.string(),
  propostaIds: z.array(z.string()),
  observacoes: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const data = postSchema.parse(body);

    if (data.propostaIds.length === 0) {
      return NextResponse.json({ error: "Nenhuma proposta selecionada" }, { status: 400 });
    }

    // Calcula o valor total a receber (soma das comissoes)
    const propostas = await prisma.proposta.findMany({
      where: {
        id: { in: data.propostaIds },
        empresaId: sessao.empresaId,
        status: "PAGA"
      }
    });

    if (propostas.length === 0) {
      return NextResponse.json({ error: "Nenhuma proposta válida encontrada" }, { status: 400 });
    }

    const valorTotal = propostas.reduce((acc, p) => acc + (p.valorComissao || 0), 0);

    // Gera um código de lote único curto
    const count = await prisma.faturaBanco.count({ where: { empresaId: sessao.empresaId } });
    const codigoLote = `LOTE-${data.bancoNome.substring(0, 3).toUpperCase()}-${String(count + 1).padStart(4, '0')}`;

    const fatura = await prisma.faturaBanco.create({
      data: {
        empresaId: sessao.empresaId,
        bancoNome: data.bancoNome,
        codigoLote,
        valorTotal,
        observacoes: data.observacoes,
        status: "PENDENTE",
        propostas: {
          connect: propostas.map(p => ({ id: p.id }))
        }
      }
    });

    return NextResponse.json(fatura);
  } catch (error: any) {
    console.error("Erro ao gerar fatura:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const faturas = await prisma.faturaBanco.findMany({
      where: { empresaId: sessao.empresaId },
      include: {
        _count: { select: { propostas: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(faturas);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
