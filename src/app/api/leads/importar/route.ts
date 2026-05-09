import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";
import { z } from "zod";

const leadImportSchema = z.object({
  nome: z.string(),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  margemLivre: z.number().optional(),
  valorLiberado: z.number().optional(),
  bancoPreferido: z.string().optional()
});

const bodySchema = z.array(leadImportSchema);

export async function POST(req: Request) {
  try {
    const sessao = await getSessionEmpresa();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const body = await req.json();
    const leadsRaw = bodySchema.parse(body);

    if (leadsRaw.length === 0) {
      return NextResponse.json({ error: "Nenhum lead para importar" }, { status: 400 });
    }

    // Usamos createMany para inserção massiva de forma rápida e atômica
    const result = await prisma.lead.createMany({
      data: leadsRaw.map(lead => ({
        empresaId: sessao.empresaId,
        nome: lead.nome,
        cpf: lead.cpf || null,
        telefone: lead.telefone || null,
        margemLivre: lead.margemLivre || null,
        valorLiberado: lead.valorLiberado || null,
        bancoPreferido: lead.bancoPreferido || null,
        origem: "importacao",
        status: "NOVO"
      }))
    });

    // Registra log de auditoria
    await prisma.auditLog.create({
      data: {
        empresaId: sessao.empresaId,
        usuarioEmail: sessao.email,
        usuarioNome: sessao.nome,
        acao: "importou",
        entidade: "lead",
        detalhes: { quantidade: result.count }
      }
    });

    return NextResponse.json({ success: true, count: result.count });

  } catch (error: any) {
    console.error("Erro na importacao:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
