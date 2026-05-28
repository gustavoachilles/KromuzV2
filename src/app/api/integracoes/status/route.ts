import { NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";
import { getFactaToken, FACTA_CONFIG } from "@/lib/facta";

/**
 * GET /api/integracoes/status
 * Retorna status de todas as integrações API (Facta, V8, etc.)
 */
export async function GET() {
  const session = await getSessionEmpresaApi();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const results: Record<string, any> = {};

  // ── Facta ──
  try {
    const token = await getFactaToken();
    results.facta = {
      nome: "Facta Financeira",
      status: token ? "online" : "offline",
      ambiente: FACTA_CONFIG.isHomol ? "Homologação" : "Produção",
      baseUrl: FACTA_CONFIG.baseUrl,
      tokenValido: !!token,
      servicos: ["INSS", "FGTS", "CLT"],
      nota: FACTA_CONFIG.isHomol
        ? "Homologação ativa. Produção bloqueada pelo Cloudflare — aguardando liberação."
        : "Produção ativa e funcionando.",
    };
  } catch (e: any) {
    results.facta = {
      nome: "Facta Financeira",
      status: "error",
      erro: e.message,
      servicos: ["INSS", "FGTS", "CLT"],
    };
  }

  // ── V8 Sistema ──
  const v8AuthUrl = process.env.V8_AUTH_URL;
  const v8ClientId = process.env.V8_CLIENT_ID;
  const v8User = process.env.V8_USERNAME;
  const v8Pass = process.env.V8_PASSWORD;

  if (v8AuthUrl && v8ClientId && v8User && v8Pass) {
    try {
      const res = await fetch(v8AuthUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "password",
          client_id: v8ClientId,
          username: v8User,
          password: v8Pass,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (res.ok) {
        const data = await res.json();
        results.v8 = {
          nome: "V8 Sistema",
          status: "online",
          ambiente: "Produção",
          baseUrl: process.env.V8_BFF_URL || "https://bff.v8sistema.com",
          tokenValido: !!data.access_token,
          tokenTipo: data.token_type,
          expiresIn: data.expires_in,
          servicos: ["Consulta CPF", "Dados Funcionais", "Margem INSS"],
          nota: "Autenticação OAuth2 bem-sucedida.",
        };
      } else {
        const text = await res.text();
        results.v8 = {
          nome: "V8 Sistema",
          status: "error",
          ambiente: "Produção",
          erro: `HTTP ${res.status}: ${text.substring(0, 200)}`,
          servicos: ["Consulta CPF", "Dados Funcionais", "Margem INSS"],
        };
      }
    } catch (e: any) {
      results.v8 = {
        nome: "V8 Sistema",
        status: "error",
        ambiente: "Produção",
        erro: e.message,
        servicos: ["Consulta CPF", "Dados Funcionais", "Margem INSS"],
      };
    }
  } else {
    results.v8 = {
      nome: "V8 Sistema",
      status: "unconfigured",
      erro: "Credenciais não configuradas (V8_AUTH_URL, V8_CLIENT_ID, V8_USERNAME, V8_PASSWORD)",
      servicos: ["Consulta CPF", "Dados Funcionais", "Margem INSS"],
    };
  }

  return NextResponse.json({ integracoes: results });
}
