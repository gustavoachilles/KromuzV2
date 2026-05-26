import { NextRequest, NextResponse } from "next/server";
import { getSessionEmpresaApi } from "@/lib/session";

/**
 * POST /api/credenciais/testar
 * 
 * Testa se uma credencial de acesso a banco/promotora está válida.
 * Recebe URL, usuário e senha e tenta validar o acesso.
 * 
 * Nesta versão, simula o teste fazendo um HEAD request na URL.
 * Na versão final, fará login real via RPA/worker externo.
 */
export async function POST(req: NextRequest) {
  try {
    const sessao = await getSessionEmpresaApi();
    if (!sessao) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

    const data = await req.json();
    const { urlLogin, usuario, senha, bancoNome } = data;

    if (!urlLogin || !usuario || !senha) {
      return NextResponse.json({ error: "URL, usuário e senha são obrigatórios." }, { status: 400 });
    }

    // TODO: Na versão final, acionar o worker RPA que faz login real no portal
    // const resultado = await fetch(process.env.RPA_WORKER_URL + '/testar-login', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RPA_SECRET}` },
    //   body: JSON.stringify({ urlLogin, usuario, senha, bancoNome }),
    // });
    // const { acessoValido, mensagem } = await resultado.json();

    // Por enquanto, verificar se a URL do portal está acessível (HEAD request)
    let urlAcessivel = false;
    let mensagem = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const response = await fetch(urlLogin, {
        method: "HEAD",
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timeout);
      urlAcessivel = response.ok || response.status === 405 || response.status === 302 || response.status === 301;
      mensagem = urlAcessivel
        ? `Portal ${bancoNome || "do banco"} está acessível (HTTP ${response.status}). Credenciais salvas — o teste completo de login será feito quando o worker RPA estiver ativo.`
        : `Portal retornou HTTP ${response.status}. Verifique a URL.`;
    } catch (e: any) {
      urlAcessivel = false;
      mensagem = e.name === "AbortError"
        ? "Timeout — o portal não respondeu em 8 segundos. Verifique a URL."
        : `Não foi possível acessar o portal: ${e.message}`;
    }

    return NextResponse.json({
      success: urlAcessivel,
      urlAcessivel,
      mensagem,
    });
  } catch (error: any) {
    console.error("Erro ao testar credencial:", error);
    return NextResponse.json({ error: "Erro interno ao testar credencial." }, { status: 500 });
  }
}
