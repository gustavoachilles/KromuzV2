import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";

// GET /api/leads/search?q=... — busca leads por CPF ou nome + propostas vinculadas
export async function GET(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 3) return Response.json({ leads: [], propostas: [] });

    const isCpf = /^\d+$/.test(q);

    const leads = await prisma.lead.findMany({
      where: {
        empresaId: sessao.empresaId,
        ...(isCpf
          ? { cpf: { contains: q } }
          : { nome: { contains: q, mode: "insensitive" } }),
      },
      select: {
        id: true, nome: true, cpf: true, telefone: true, email: true,
        uf: true, cidade: true, numeroBeneficio: true, especieBeneficio: true,
        margemLivre: true, margemRmc: true, margemRcc: true, tipoOperacao: true,
        bancoPreferido: true, convenioNome: true, valorLiberado: true,
        vendedorNome: true, vendedorEmail: true, score: true, createdAt: true,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    let propostas: any[] = [];
    if (leads.length > 0) {
      const leadIds = leads.map(l => l.id);
      const cpfs = leads.map(l => l.cpf).filter(Boolean) as string[];

      propostas = await prisma.proposta.findMany({
        where: {
          empresaId: sessao.empresaId,
          OR: [
            { leadId: { in: leadIds } },
            ...(cpfs.length > 0 ? [{ clienteCpf: { in: cpfs } }] : []),
          ],
        },
        select: {
          id: true, clienteNome: true, clienteCpf: true, status: true,
          tipoOperacao: true, bancoNome: true, valorLiberado: true,
          valorComissao: true, codigoPropostaBanco: true, pagaEm: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });
    }

    return Response.json({ leads, propostas });
  } catch (e) {
    console.error("[LEADS_SEARCH]", e);
    return Response.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
