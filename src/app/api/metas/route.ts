import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

// GET /api/metas?ano=2026&mes=5
export async function GET(req: Request) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const ano = Number(url.searchParams.get("ano") || new Date().getFullYear());
  const mes = url.searchParams.get("mes") ? Number(url.searchParams.get("mes")) : undefined;

  const metas = await prisma.meta.findMany({
    where: {
      empresaId: sessao.empresaId,
      ano,
      ...(mes ? { mes } : {}),
    },
    orderBy: [{ mes: "asc" }, { vendedorNome: "asc" }],
  });

  return Response.json(metas);
}

const CriarMetaSchema = z.object({
  vendedorEmail: z.string().email(),
  vendedorNome: z.string().optional(),
  mes: z.number().int().min(1).max(12),
  ano: z.number().int().min(2024).max(2030),
  metaPropostas: z.number().int().optional(),
  metaVolume: z.number().optional(),
  metaLeads: z.number().int().optional(),
  metaComissao: z.number().optional(),
});

// POST /api/metas — upsert (cria ou atualiza)
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = CriarMetaSchema.parse(await req.json());

    const meta = await prisma.meta.upsert({
      where: {
        empresaId_vendedorEmail_mes_ano: {
          empresaId: sessao.empresaId,
          vendedorEmail: body.vendedorEmail,
          mes: body.mes,
          ano: body.ano,
        },
      },
      update: {
        vendedorNome: body.vendedorNome,
        metaPropostas: body.metaPropostas,
        metaVolume: body.metaVolume,
        metaLeads: body.metaLeads,
        metaComissao: body.metaComissao,
      },
      create: {
        empresaId: sessao.empresaId,
        vendedorEmail: body.vendedorEmail,
        vendedorNome: body.vendedorNome,
        mes: body.mes,
        ano: body.ano,
        metaPropostas: body.metaPropostas,
        metaVolume: body.metaVolume,
        metaLeads: body.metaLeads,
        metaComissao: body.metaComissao,
      },
    });

    return Response.json(meta, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
