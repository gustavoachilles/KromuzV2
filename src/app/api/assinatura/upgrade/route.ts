import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionEmpresa } from "@/lib/session";
import { getPlano, PLANOS, type PlanoSlug } from "@/lib/planos";
import { createAsaasSubscription } from "@/lib/asaas";

const PRECOS: Record<string, number> = {
  start: 69.90,
  pro: 149.90,
  black: 349.90,
};

export async function POST(request: NextRequest) {
  try {
    const sessao = await getSessionEmpresa();
    const { planoDesejado } = await request.json();

    // Validações
    if (!planoDesejado || !PRECOS[planoDesejado]) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }

    const empresa = await prisma.empresa.findUnique({
      where: { id: sessao.empresaId },
      select: { planoSlug: true, asaasCustomerId: true, nomeEmpresa: true },
    });

    if (!empresa) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 });
    }

    // Verificar se é upgrade (não permitir downgrade por aqui)
    const ordemPlanos: PlanoSlug[] = ["start", "pro", "black"];
    const idxAtual = ordemPlanos.indexOf(empresa.planoSlug as PlanoSlug);
    const idxDesejado = ordemPlanos.indexOf(planoDesejado as PlanoSlug);

    if (idxDesejado <= idxAtual && empresa.planoSlug !== "beta") {
      return NextResponse.json({ error: "Downgrade não permitido por esta rota. Entre em contato com o suporte." }, { status: 400 });
    }

    const planoInfo = getPlano(planoDesejado);
    const valor = PRECOS[planoDesejado];

    // Criar assinatura no Asaas (se tiver customerId)
    let asaasSubscription = null;
    if (empresa.asaasCustomerId) {
      try {
        asaasSubscription = await createAsaasSubscription(
          empresa.asaasCustomerId,
          valor,
          `Kromuz ${planoInfo.nome} - Assinatura Mensal`
        );
        console.log("✅ [Asaas] Assinatura criada:", asaasSubscription.id);
      } catch (err) {
        console.error("⚠️ [Asaas] Erro ao criar assinatura, prosseguindo com upgrade local:", err);
      }
    }

    // Atualizar plano da empresa no banco
    await prisma.empresa.update({
      where: { id: sessao.empresaId },
      data: {
        planoSlug: planoDesejado,
        statusAssinatura: "ACTIVE",
      },
    });

    // Registrar fatura inicial (pendente)
    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 30); // Vence em 30 dias

    await prisma.faturaSaaS.create({
      data: {
        empresaId: sessao.empresaId,
        valor,
        status: "PENDING",
        vencimento,
        asaasInvoiceId: asaasSubscription?.id || null,
        linkPagamento: asaasSubscription?.paymentLink || null,
      },
    });

    console.log(`🚀 [Upgrade] ${empresa.nomeEmpresa}: ${empresa.planoSlug} → ${planoDesejado} (R$ ${valor})`);

    return NextResponse.json({
      success: true,
      plano: planoDesejado,
      nome: planoInfo.nome,
      valor,
      paymentLink: asaasSubscription?.paymentLink || null,
      message: `Upgrade para ${planoInfo.nome} realizado com sucesso!`,
    });

  } catch (err: any) {
    console.error("❌ [Upgrade] Erro:", err);
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}
