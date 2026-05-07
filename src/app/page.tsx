import Link from "next/link";
import {
  Brain,
  ArrowRight,
  Sparkles,
  Database,
  Layers,
  BarChart3,
  Calculator,
  BookOpen,
  FileText,
  Settings,
  Shield,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-violet-50/40 dark:from-black dark:via-zinc-950 dark:to-violet-950/20">
      <main className="max-w-5xl mx-auto px-6 py-20 md:py-28 space-y-16">
        <header className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50/60 px-3 py-1 text-xs font-medium text-violet-700 dark:border-violet-900/40 dark:bg-violet-950/40 dark:text-violet-300">
            <Sparkles className="h-3.5 w-3.5" /> Plataforma Completa · Sprints 1–6
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Kromuz <span className="bg-gradient-to-tr from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">V2</span>
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl">
            Plataforma SaaS premium de crédito consignado, reconstruída do zero com Next.js,
            Supabase, Prisma e LLMs de última geração.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-500 px-5 py-3 text-white font-medium shadow-lg shadow-violet-500/25 hover:opacity-95 transition"
            >
              <BarChart3 className="h-4 w-4" /> Acessar Dashboard <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-3 text-zinc-700 dark:text-zinc-300 font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
            >
              Fazer Login
            </Link>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Feature
            icon={<BarChart3 className="h-5 w-5" />}
            titulo="Dashboard Inteligente"
            sub="KPIs em tempo real, gráfico de regras por tipo, importações recentes e ações rápidas."
            ativo
          />
          <Feature
            icon={<Brain className="h-5 w-5" />}
            titulo="Motor de Regras V2"
            sub="Lê PDFs de roteiros operacionais e extrai regras via Gemini + Claude com IA generativa."
            ativo
          />
          <Feature
            icon={<Calculator className="h-5 w-5" />}
            titulo="Simulador HISCON"
            sub="Upload de extrato INSS para análise de oportunidades de crédito em tempo real."
            ativo
          />
          <Feature
            icon={<FileText className="h-5 w-5" />}
            titulo="Roteiros Operacionais"
            sub="Histórico completo de importações com status, modelo IA e navegação para regras."
            ativo
          />
          <Feature
            icon={<BookOpen className="h-5 w-5" />}
            titulo="Regras Editáveis"
            sub="Edição inline campo a campo com filtros por banco, tipo e busca textual."
            ativo
          />
          <Feature
            icon={<Layers className="h-5 w-5" />}
            titulo="Bancos & Tabelas"
            sub="CRUD completo de bancos, produtos e tabelas de coeficientes com modal de criação."
            ativo
          />
          <Feature
            icon={<Settings className="h-5 w-5" />}
            titulo="Configurações"
            sub="Gestão de dados da empresa, cor primária, equipe e controle de perfis (Admin/Gerente/Vendedor)."
            ativo
          />
          <Feature
            icon={<Shield className="h-5 w-5" />}
            titulo="Multi-Tenant Nativo"
            sub="PostgreSQL com empresaId em cada query. Isolamento total de dados entre empresas."
            ativo
          />
          <Feature
            icon={<Database className="h-5 w-5" />}
            titulo="Esteira & CRM"
            sub="Funil, propostas, comissões com SLA, rede Kromuz."
          />
        </section>

        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-6 space-y-4">
          <h2 className="text-lg font-semibold">Stack tecnológica</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs font-medium">
            {[
              "Next.js 16",
              "TypeScript 5",
              "Tailwind 4",
              "Supabase Postgres",
              "Prisma 7",
              "Vercel AI SDK 6",
              "Gemini 3.1 Pro",
              "Claude Sonnet 4.6",
              "Lucide Icons",
              "Zod 4",
              "Multi-Tenant",
              "RBAC (Admin/Gerente/Vendedor)",
            ].map((s) => (
              <span
                key={s}
                className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-center"
              >
                {s}
              </span>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({
  icon,
  titulo,
  sub,
  ativo,
}: {
  icon: React.ReactNode;
  titulo: string;
  sub: string;
  ativo?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border p-5 space-y-2 " +
        (ativo
          ? "border-violet-200 bg-gradient-to-br from-violet-50/60 to-fuchsia-50/40 dark:border-violet-900/40 dark:from-violet-950/30 dark:to-fuchsia-950/20"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950")
      }
    >
      <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400">
        {icon}
        <span className="text-xs uppercase tracking-widest font-semibold">
          {ativo ? "Disponível" : "Próximas sprints"}
        </span>
      </div>
      <p className="text-base font-semibold">{titulo}</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{sub}</p>
    </div>
  );
}
