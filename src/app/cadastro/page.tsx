"use client";

import { useState, Suspense } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, UserPlus, Eye, EyeOff, Building2, User, Zap, Star, Crown, CheckCircle2 } from "lucide-react";

const PLANOS = [
  { slug: "start", nome: "Start", preco: "R$ 69,90", cor: "#22c55e", icon: Zap, destaque: false, desc: "5 usuários · 1.000 leads" },
  { slug: "pro", nome: "Pro", preco: "R$ 149,90", cor: "#3b82f6", icon: Star, destaque: true, desc: "10 usuários · 10.000 leads" },
  { slug: "black", nome: "Black", preco: "R$ 349,90", cor: "#a855f7", icon: Crown, destaque: false, desc: "Ilimitado · Todos os módulos" },
];

export default function CadastroPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950" />}>
      <CadastroForm />
    </Suspense>
  );
}

function CadastroForm() {
  const [step, setStep] = useState(1); // 1 = plano, 2 = dados
  const [planoSelecionado, setPlanoSelecionado] = useState("start");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Se veio com ?plano=pro na URL, já seleciona
  useState(() => {
    const planoUrl = searchParams.get("plano");
    if (planoUrl && ["start", "pro", "black"].includes(planoUrl)) {
      setPlanoSelecionado(planoUrl);
      setStep(2);
    }
  });

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, nome, empresa, plano: planoSelecionado })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Erro ao criar conta");
      setLoading(false);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithPassword({ email, password });
    setSuccess(true);
    setLoading(false);

    setTimeout(() => {
      router.push("/simulador");
      router.refresh();
    }, 2000);
  }

  const planoAtual = PLANOS.find(p => p.slug === planoSelecionado)!;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-violet-950/30 px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-violet-500/25">
              K
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-white">Kromuz</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-violet-400">Plataforma de Crédito</p>
            </div>
          </div>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${step >= 1 ? "bg-violet-500/20 text-violet-400" : "bg-zinc-800 text-zinc-500"}`}>
            <span className="w-5 h-5 rounded-full bg-violet-500/30 flex items-center justify-center text-[10px]">1</span>
            Plano
          </div>
          <div className="w-8 h-px bg-zinc-700" />
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${step >= 2 ? "bg-violet-500/20 text-violet-400" : "bg-zinc-800 text-zinc-500"}`}>
            <span className="w-5 h-5 rounded-full bg-violet-500/30 flex items-center justify-center text-[10px]">2</span>
            Dados
          </div>
        </div>

        {success ? (
          <div className="rounded-2xl border border-emerald-800/80 bg-emerald-900/40 backdrop-blur-xl p-8 text-center space-y-4 shadow-2xl">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <UserPlus className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-medium text-emerald-400">Conta criada com sucesso!</h2>
            <p className="text-sm text-emerald-200/70">
              Plano <span className="font-bold">{planoAtual.nome}</span> ativado. Redirecionando...
            </p>
          </div>
        ) : step === 1 ? (
          /* ── Step 1: Escolher Plano ── */
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">Escolha seu plano</h1>
              <p className="text-sm text-zinc-400 mt-1">7 dias grátis em qualquer plano. Cancele quando quiser.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PLANOS.map((plano) => {
                const Icon = plano.icon;
                const isSelected = planoSelecionado === plano.slug;
                return (
                  <button
                    key={plano.slug}
                    type="button"
                    onClick={() => setPlanoSelecionado(plano.slug)}
                    className={`relative rounded-2xl p-5 text-left transition-all duration-200 border-2 ${
                      isSelected 
                        ? "border-opacity-100 scale-[1.02] shadow-xl" 
                        : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/60"
                    }`}
                    style={isSelected ? { 
                      borderColor: plano.cor, 
                      backgroundColor: `${plano.cor}08`,
                      boxShadow: `0 8px 30px ${plano.cor}15`
                    } : {}}
                  >
                    {plano.destaque && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-gradient-to-r from-blue-500 to-violet-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                          POPULAR
                        </span>
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <CheckCircle2 className="w-5 h-5" style={{ color: plano.cor }} />
                      </div>
                    )}

                    <div className="flex items-center gap-2.5 mb-3">
                      <div 
                        className="w-9 h-9 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${plano.cor}15` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: plano.cor }} />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">{plano.nome}</h3>
                        <p className="text-[10px] text-zinc-500">{plano.desc}</p>
                      </div>
                    </div>

                    <div className="flex items-end gap-0.5">
                      <span className="text-2xl font-black text-white">{plano.preco}</span>
                      <span className="text-xs text-zinc-500 mb-1">/mês</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 transition"
            >
              Continuar com {planoAtual.nome}
            </button>
          </div>
        ) : (
          /* ── Step 2: Dados da Conta ── */
          <form onSubmit={handleCadastro} className="space-y-5">
            {/* Plano selecionado resumo */}
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 hover:bg-zinc-900 transition"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${planoAtual.cor}15` }}
                >
                  <planoAtual.icon className="w-4 h-4" style={{ color: planoAtual.cor }} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Plano {planoAtual.nome}</p>
                  <p className="text-[10px] text-zinc-500">{planoAtual.preco}/mês · 7 dias grátis</p>
                </div>
              </div>
              <span className="text-xs text-violet-400 font-medium">Alterar</span>
            </button>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-6 space-y-4 shadow-2xl">
              {error && (
                <div className="rounded-lg bg-red-950/40 border border-red-900/50 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="nome" className="text-sm font-medium text-zinc-300">Seu Nome</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      id="nome"
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="João Silva"
                      className="w-full rounded-lg border border-zinc-700/80 bg-zinc-800/50 pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="empresa" className="text-sm font-medium text-zinc-300">Sua Empresa</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      id="empresa"
                      type="text"
                      required
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      placeholder="Promotora XYZ"
                      className="w-full rounded-lg border border-zinc-700/80 bg-zinc-800/50 pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-zinc-300">Email profissional</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao@promotoraxyz.com.br"
                  className="w-full rounded-lg border border-zinc-700/80 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-zinc-300">Senha (mínimo 6 caracteres)</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-zinc-700/80 bg-zinc-800/50 px-4 py-3 pr-12 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 disabled:opacity-50 transition"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loading ? "Criando conta..." : `Criar conta — Plano ${planoAtual.nome}`}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-zinc-500">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-violet-400 hover:opacity-80 font-medium transition">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
