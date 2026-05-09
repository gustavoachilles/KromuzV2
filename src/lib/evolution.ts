// Wrapper para Evolution API (v1 / v2)
// Lê as chaves do banco de dados (da tabela CanalComunicacao) ou de env vars.

export async function createEvolutionInstance(apiUrl: string, apiKey: string, instanceName: string) {
  const response = await fetch(`${apiUrl}/instance/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": apiKey
    },
    body: JSON.stringify({
      instanceName: instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS"
    })
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar instância: ${await response.text()}`);
  }

  return response.json(); // { instance: { instanceName: "...", status: "..." }, hash: { apikey: "..." } }
}

export async function getEvolutionQRCode(apiUrl: string, apiKey: string, instanceName: string) {
  const response = await fetch(`${apiUrl}/instance/connect/${instanceName}`, {
    method: "GET",
    headers: {
      "apikey": apiKey
    }
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar QR Code: ${await response.text()}`);
  }

  return response.json(); // { base64: "...", count: 1 }
}

export async function getEvolutionConnectionState(apiUrl: string, apiKey: string, instanceName: string) {
  const response = await fetch(`${apiUrl}/instance/connectionState/${instanceName}`, {
    method: "GET",
    headers: {
      "apikey": apiKey
    }
  });

  if (!response.ok) {
    return { instance: { state: "disconnected" } };
  }

  return response.json(); // { instance: { state: "open" } }
}

export async function setEvolutionWebhook(apiUrl: string, apiKey: string, instanceName: string, webhookUrl: string) {
  const response = await fetch(`${apiUrl}/webhook/set/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": apiKey
    },
    body: JSON.stringify({
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: false,
      events: [
        "APPLICATION_STARTUP",
        "QRCODE_UPDATED",
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "SEND_MESSAGE",
        "CONNECTION_UPDATE"
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Erro ao setar webhook: ${await response.text()}`);
  }

  return response.json();
}

export async function sendEvolutionText(apiUrl: string, apiKey: string, instanceName: string, to: string, text: string) {
  const response = await fetch(`${apiUrl}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": apiKey
    },
    body: JSON.stringify({
      number: to,
      options: {
        delay: 1200,
        presence: "composing",
        linkPreview: false
      },
      textMessage: {
        text: text
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Erro ao enviar mensagem: ${await response.text()}`);
  }

  return response.json();
}
