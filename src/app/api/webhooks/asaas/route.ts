import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Asaas envia eventos de pagamento para este endpoint
// URL: https://kromuzv2.onrender.com/api/webhooks/asaas

const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || "";

export async function POST(request: NextRequest) {
  try {
    // Validar token de autenticação
    const token = request.headers.get("asaas-access-token");
    if (ASAAS_WEBHOOK_TOKEN && token !== ASAAS_WEBHOOK_TOKEN) {
      console.error("❌ [Asaas Webhook] Token inválido");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await request.json();
    const { event, payment } = body;

    console.log(`📩 [Asaas Webhook] Evento: ${event}`, payment?.id);

    if (!payment?.id) {
      return NextResponse.json({ received: true });
    }

    // Buscar fatura pelo asaasInvoiceId
    const fatura = await prisma.faturaSaaS.findFirst({
      where: { asaasInvoiceId: payment.id },
      include: { empresa: true },
    });

    switch (event) {
      // ── Pagamento confirmado ──
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED": {
        if (fatura) {
          await prisma.faturaSaaS.update({
            where: { id: fatura.id },
            data: { 
              status: "PAID",
              linkPagamento: payment.invoiceUrl || fatura.linkPagamento,
            },
          });

          // Ativar assinatura da empresa
          await prisma.empresa.update({
            where: { id: fatura.empresaId },
            data: { statusAssinatura: "ACTIVE" },
          });

          console.log(`✅ [Asaas] Pagamento confirmado: Fatura ${fatura.id} → PAID`);
        } else {
          console.log(`⚠️ [Asaas] Fatura não encontrada para payment ${payment.id}`);
        }
        break;
      }

      // ── Pagamento vencido ──
      case "PAYMENT_OVERDUE": {
        if (fatura) {
          await prisma.faturaSaaS.update({
            where: { id: fatura.id },
            data: { status: "OVERDUE" },
          });

          // Marcar empresa como inadimplente
          await prisma.empresa.update({
            where: { id: fatura.empresaId },
            data: { statusAssinatura: "OVERDUE" },
          });

          console.log(`🔴 [Asaas] Pagamento vencido: Empresa ${fatura.empresa.nomeEmpresa} → OVERDUE`);
        }
        break;
      }

      // ── Pagamento criado (link disponível) ──
      case "PAYMENT_CREATED": {
        if (fatura && payment.invoiceUrl) {
          await prisma.faturaSaaS.update({
            where: { id: fatura.id },
            data: { linkPagamento: payment.invoiceUrl },
          });
          console.log(`🔗 [Asaas] Link de pagamento atualizado: ${payment.invoiceUrl}`);
        }
        break;
      }

      // ── Assinatura renovada ──
      case "PAYMENT_CREATED_BY_SUBSCRIPTION": {
        // Quando o Asaas gera automaticamente uma nova cobrança mensal
        if (payment.subscription) {
          // Buscar a empresa pelo customer
          const empresa = await prisma.empresa.findFirst({
            where: { asaasCustomerId: payment.customer },
          });

          if (empresa) {
            const vencimento = new Date(payment.dueDate);
            await prisma.faturaSaaS.create({
              data: {
                empresaId: empresa.id,
                valor: payment.value,
                status: "PENDING",
                vencimento,
                asaasInvoiceId: payment.id,
                linkPagamento: payment.invoiceUrl || null,
              },
            });
            console.log(`📄 [Asaas] Nova fatura mensal criada para ${empresa.nomeEmpresa}: R$ ${payment.value}`);
          }
        }
        break;
      }

      // ── Pagamento estornado ──
      case "PAYMENT_REFUNDED":
      case "PAYMENT_CHARGEBACK_REQUESTED": {
        if (fatura) {
          await prisma.faturaSaaS.update({
            where: { id: fatura.id },
            data: { status: "OVERDUE" },
          });
          await prisma.empresa.update({
            where: { id: fatura.empresaId },
            data: { statusAssinatura: "OVERDUE" },
          });
          console.log(`⚠️ [Asaas] Estorno/Chargeback: Empresa ${fatura.empresa.nomeEmpresa}`);
        }
        break;
      }

      default:
        console.log(`ℹ️ [Asaas] Evento ignorado: ${event}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("❌ [Asaas Webhook] Erro:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
