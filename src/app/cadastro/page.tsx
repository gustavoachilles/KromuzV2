"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Eye, EyeOff, Building2, User } from "lucide-react";

export default function CadastroPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/cadastro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, nome, empresa })
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || "Erro ao criar conta");
      setLoading(false);
      return;
    }

    // A sessão é criada automaticamente pelo Supabase no backend
    // ou precisamos forçar o sign in aqui se o backend não passar os cookies corretos.
    // Para simplificar:
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithPassword({ email, password });
    setSuccess(true);
    setLoading(false);

    // Redireciona após 2 segundos
    setTimeout(() => {
      router.push("/simulador");
      router.refresh();
    }, 2000);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-brand/20 px-4 py-8">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-brand/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-brand/25">
              K
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold text-white">Kromuz</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-brand">
                Plataforma de Crédito
              </p>
            </div>
          </div>
          <h1 className="text-xl font-semibold text-white">
            Crie sua conta
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Comece a usar o motor de regras com IA
          </p>
        </div>

        {success ? (
          <div className="rounded-2xl border border-emerald-800/80 bg-emerald-900/40 backdrop-blur-xl p-8 text-center space-y-4 shadow-2xl">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <UserPlus className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-medium text-emerald-400">Conta criada com sucesso!</h2>
            <p className="text-sm text-emerald-200/70">Redirecionando você para a plataforma...</p>
          </div>
        ) : (
          <form onSubmit={handleCadastro} className="space-y-5">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-6 space-y-4 shadow-2xl">
              {error && (
                <div className="rounded-lg bg-red-950/40 border border-red-900/50 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="nome" className="text-sm font-medium text-zinc-300">
                    Seu Nome
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      id="nome"
                      type="text"
                      required
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="João Silva"
                      className="w-full rounded-lg border border-zinc-700/80 bg-zinc-800/50 pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="empresa" className="text-sm font-medium text-zinc-300">
                    Sua Empresa
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <input
                      id="empresa"
                      type="text"
                      required
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      placeholder="Promotora XYZ"
                      className="w-full rounded-lg border border-zinc-700/80 bg-zinc-800/50 pl-10 pr-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-zinc-300">
                  Email profissional
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joao@promotoraxyz.com.br"
                  className="w-full rounded-lg border border-zinc-700/80 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-zinc-300">
                  Senha (mínimo 6 caracteres)
                </label>
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
                    className="w-full rounded-lg border border-zinc-700/80 bg-zinc-800/50 px-4 py-3 pr-12 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition"
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 disabled:opacity-50 transition"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loading ? "Criando conta..." : "Criar minha conta"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-zinc-500">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-brand hover:opacity-80 font-medium transition">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
