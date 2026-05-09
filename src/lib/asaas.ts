// Wrapper Básico para API do Asaas (Sandbox / Produção)
// Permite criação de clientes (Empresas) e geração de cobranças.

const ASAAS_API_URL = process.env.ASAAS_API_URL || "https://sandbox.asaas.com/api/v3";
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || "";

export async function createAsaasCustomer(name: string, cpfCnpj: string, email: string) {
  if (!ASAAS_API_KEY) return { id: "cus_mock_" + Math.random().toString(36).substring(7) };

  const response = await fetch(`${ASAAS_API_URL}/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY
    },
    body: JSON.stringify({
      name,
      cpfCnpj,
      email
    })
  });

  if (!response.ok) {
    console.error("Erro ao criar cliente Asaas", await response.text());
    throw new Error("Falha na integração com Asaas");
  }

  return response.json();
}

export async function createAsaasSubscription(customerId: string, value: number, description: string) {
  if (!ASAAS_API_KEY) return { id: "sub_mock_" + Math.random().toString(36).substring(7) };

  const response = await fetch(`${ASAAS_API_URL}/subscriptions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY
    },
    body: JSON.stringify({
      customer: customerId,
      billingType: "UNDEFINED", // Permite Cartão, Boleto ou PIX
      value,
      nextDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Daqui a 30 dias
      cycle: "MONTHLY",
      description
    })
  });

  if (!response.ok) {
    console.error("Erro ao criar assinatura Asaas", await response.text());
    throw new Error("Falha na integração com Asaas");
  }

  return response.json();
}

export async function createAsaasInvoice(customerId: string, value: number, dueDate: string, description: string) {
  if (!ASAAS_API_KEY) {
    return { 
      id: "inv_mock_" + Math.random().toString(36).substring(7),
      invoiceUrl: "https://sandbox.asaas.com/i/mocked_invoice"
    };
  }

  const response = await fetch(`${ASAAS_API_URL}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "access_token": ASAAS_API_KEY
    },
    body: JSON.stringify({
      customer: customerId,
      billingType: "UNDEFINED",
      value,
      dueDate,
      description
    })
  });

  if (!response.ok) {
    console.error("Erro ao criar fatura Asaas", await response.text());
    throw new Error("Falha na integração com Asaas");
  }

  return response.json();
}
