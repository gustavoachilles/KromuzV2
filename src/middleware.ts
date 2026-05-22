import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// ═══ Rate Limiting Global (in-memory, por IP) ═══
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isGlobalRateLimited(ip: string, pathname: string): boolean {
  const now = Date.now();
  const key = `${ip}:global`;

  // Limites por tipo de rota
  let maxRequests = 60;  // 60 req/min padrão
  let windowMs = 60_000;

  if (pathname.startsWith("/api/ai/")) {
    maxRequests = 10; // IA é caro
    windowMs = 60_000;
  } else if (pathname.includes("/upload") || pathname.includes("/importar") || pathname.includes("/extrair")) {
    maxRequests = 5; // Upload pesado
    windowMs = 60_000;
  } else if (pathname.startsWith("/api/inbox/") || pathname.startsWith("/api/mensagens/")) {
    return false; // Já tem rate limit individual
  }

  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > maxRequests;
}

// Limpar entries antigas a cada 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
}, 300_000);

// ═══ CORS Headers ═══
function addCorsHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get("origin") || "";
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    "https://kromuz.vercel.app",
    "https://crm.datacrazy.io",
  ];

  if (allowedOrigins.some(o => origin.startsWith(o)) || !origin) {
    response.headers.set("Access-Control-Allow-Origin", origin || "*");
  }
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  response.headers.set("Access-Control-Max-Age", "86400");

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CORS preflight
  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response, request);
  }

  // ═══ Rate Limiting Global ═══
  if (pathname.startsWith("/api/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
               request.headers.get("x-real-ip") || "unknown";

    if (isGlobalRateLimited(ip, pathname)) {
      return addCorsHeaders(
        NextResponse.json({ error: "Muitas requisições. Tente novamente em breve." }, { status: 429 }),
        request
      );
    }
  }

  // ═══ Webhook Signature Validation ═══
  if (pathname.startsWith("/api/webhooks/evolution")) {
    const apiKey = request.headers.get("apikey") || request.headers.get("x-api-key") || "";
    const expectedKey = process.env.EVOLUTION_API_KEY || "";
    // Se a key da Evolution está configurada, validar
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: "Webhook não autorizado" }, { status: 403 });
    }
    // Webhooks não passam por auth
    return addCorsHeaders(NextResponse.next({ request }), request);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rotas públicas — não exigem autenticação
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/cadastro" ||
    pathname === "/analise" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/seed") ||
    pathname.startsWith("/simulador-fgts") ||
    pathname.startsWith("/simulador-inss") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  // Se não está logado e tenta acessar área protegida → login ou 401
  if (!user && !isPublic) {
    if (pathname.startsWith("/api/")) {
      return addCorsHeaders(
        NextResponse.json({ error: "Acesso negado. Token/Sessão ausente." }, { status: 401 }),
        request
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // Se está logado e tenta acessar login/cadastro → dashboard
  if (user && (pathname === "/login" || pathname === "/cadastro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return addCorsHeaders(supabaseResponse, request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
