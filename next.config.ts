import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Otimizações de produção
  poweredByHeader: false,

  // Configurações experimentais para Vercel
  serverExternalPackages: ["@prisma/client", "pdf-parse"],


  // Headers de segurança
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
