"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, LogIn, Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "loading" | "success">("idle");
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams?.get("redirect") || "/dashboard";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message === "Email not confirmed") {
        setError("Seu e-mail ainda não foi confirmado.");
        setIsUnconfirmed(true);
      } else {
        setError(
          error.message === "Invalid login credentials"
            ? "Email ou senha incorretos."
            : error.message
        );
        setIsUnconfirmed(false);
      }
      setLoading(false);
      return;
    }

    router.push(redirectTo);
    router.refresh();
  }

  async function handleResendEmail() {
    if (!email) return;
    setResendStatus("loading");
    
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    if (error) {
      setError("Erro ao reenviar: " + error.message);
      setResendStatus("idle");
    } else {
      setResendStatus("success");
      setError(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-brand/20 px-4">
      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand/10 rounded-full blur-3xl" />
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
            Acesse sua conta
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Entre com seu email e senha para continuar
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-6 space-y-4 shadow-2xl">
            {error && !isUnconfirmed && (
              <div className="rounded-lg bg-red-950/40 border border-red-900/50 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                {error}
              </div>
            )}

            {isUnconfirmed && (
              <div className="rounded-lg bg-amber-950/40 border border-amber-900/50 px-4 py-4 text-sm text-amber-300 flex flex-col gap-3">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠️</span>
                  <span>{error || "Seu e-mail ainda não foi confirmado."}</span>
                </div>
                {resendStatus === "success" ? (
                  <div className="text-emerald-400 bg-emerald-950/50 p-2 rounded-lg text-xs font-medium border border-emerald-900/50">
                    ✓ E-mail reenviado com sucesso! Por favor, verifique sua caixa de entrada e também a pasta de SPAM.
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleResendEmail}
                    disabled={resendStatus === "loading"}
                    className="self-start text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg transition flex items-center gap-2"
                  >
                    {resendStatus === "loading" && <Loader2 className="w-3 h-3 animate-spin" />}
                    Reenviar e-mail de confirmação
                  </button>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-zinc-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full rounded-lg border border-zinc-700/80 bg-zinc-800/50 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-zinc-300"
              >
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
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
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 disabled:opacity-50 transition"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogIn className="h-4 w-4" />
            )}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          Não tem conta?{" "}
          <Link
            href="/cadastro"
            className="text-brand hover:opacity-80 font-medium transition"
          >
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  );
}
