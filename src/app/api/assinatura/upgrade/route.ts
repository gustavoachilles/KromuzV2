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

    // Verificar direção da mudança
    const ordemPlanos: PlanoSlug[] = ["start", "pro", "black"];
    const idxAtual = ordemPlanos.indexOf(empresa.planoSlug as PlanoSlug);
    const idxDesejado = ordemPlanos.indexOf(planoDesejado as PlanoSlug);
    const isUpgrade = idxDesejado > idxAtual || empresa.planoSlug === "beta";
    const isDowngrade = idxDesejado < idxAtual;

    if (!isUpgrade && !isDowngrade) {
      return NextResponse.json({ error: "Você já está neste plano." }, { status: 400 });
    }

    const planoInfo = getPlano(planoDesejado);
    const valor = PRECOS[planoDesejado];

    // Criar assinatura no Asaas apenas para upgrade
    let asaasSubscription = null;
    if (isUpgrade && empresa.asaasCustomerId) {
      try {
        asaasSubscription = await createAsaasSubscription(
          empresa.asaasCustomerId,
          valor,
          `Kromuz ${planoInfo.nome} - Assinatura Mensal`
        );
        console.log("✅ [Asaas] Assinatura criada:", asaasSubscription.id);
      } catch (err) {
        console.error("⚠️ [Asaas] Erro ao criar assinatura, prosseguindo:", err);
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

    // Registrar fatura apenas em upgrade
    if (isUpgrade) {
      const vencimento = new Date();
      vencimento.setDate(vencimento.getDate() + 30);
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
    }

    const acao = isUpgrade ? "Upgrade" : "Downgrade";
    console.log(`🚀 [${acao}] ${empresa.nomeEmpresa}: ${empresa.planoSlug} → ${planoDesejado} (R$ ${valor})`);

    return NextResponse.json({
      success: true,
      plano: planoDesejado,
      nome: planoInfo.nome,
      valor,
      isUpgrade,
      paymentLink: asaasSubscription?.paymentLink || null,
      message: `${acao} para ${planoInfo.nome} realizado com sucesso!`,
    });

  } catch (err: any) {
    console.error("❌ [Upgrade] Erro:", err);
    return NextResponse.json({ error: err.message || "Erro interno" }, { status: 500 });
  }
}
