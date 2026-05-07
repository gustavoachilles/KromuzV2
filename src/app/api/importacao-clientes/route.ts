import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresaApi } from "@/lib/session";
import { z } from "zod";

const LeadImportSchema = z.object({
  nome: z.string().min(1),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().optional(),
  uf: z.string().max(2).optional(),
  cidade: z.string().optional(),
  numeroBeneficio: z.string().optional(),
  especieBeneficio: z.number().int().optional(),
  margemLivre: z.number().optional(),
  margemRmc: z.number().optional(),
  margemRcc: z.number().optional(),
  tipoOperacao: z.string().optional(),
  origem: z.string().optional(),
});

const ImportSchema = z.object({
  leads: z.array(LeadImportSchema).min(1).max(500),
});

// POST /api/importacao-clientes — importação em massa
export async function POST(req: NextRequest) {
  const sessao = await getSessionEmpresaApi();
  if (!sessao) return Response.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const body = ImportSchema.parse(await req.json());

    const created = await prisma.lead.createMany({
      data: body.leads.map((l) => ({
        empresaId: sessao.empresaId,
        nome: l.nome,
        cpf: l.cpf || null,
        telefone: l.telefone || null,
        email: l.email || null,
        uf: l.uf || null,
        cidade: l.cidade || null,
        numeroBeneficio: l.numeroBeneficio || null,
        especieBeneficio: l.especieBeneficio || null,
        margemLivre: l.margemLivre || null,
        margemRmc: l.margemRmc || null,
        margemRcc: l.margemRcc || null,
        tipoOperacao: (l.tipoOperacao as any) || null,
        origem: l.origem || "importacao",
        vendedorEmail: sessao.email,
        vendedorNome: sessao.nomeUsuario,
        status: "NOVO",
      })),
      skipDuplicates: true,
    });

    return Response.json({ importados: created.count }, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}
