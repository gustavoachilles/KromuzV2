"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, DollarSign, Wallet,
  Trash2, Calendar
} from "lucide-react";
import { SkeletonTable } from "@/components/ui/Skeleton";

type Transacao = {
  id: string; tipo: string; categoria: string; descricao: string; valor: number;
  bancoNome?: string; statusPagamento: string; dataPagamento?: string;
  criadoPor?: string; observacoes?: string; createdAt: string;
};

type Extrato = {
  vendedorEmail: string; vendedorNome: string;
  creditos: number; debitos: number; saldo: number;
  transacoes: Transacao[];
};

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }); }

const CATEGORIAS: Record<string, string> = {
  COMISSAO: "Comissão", ESTORNO: "Estorno", VALE: "Vale", ADIANTAMENTO: "Adiantamento",
  DESCONTO_INSS: "INSS", MULTA: "Multa", SAQUE: "Saque", AJUSTE: "Ajuste",
};

export function ExtratoVendedorClient({ email }: { email: string }) {
  const [data, setData] = useState<Extrato | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchExtrato = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/contabil/carteira?email=${encodeURIComponent(email)}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchExtrato(); }, [email]);

  const excluir = async (id: string) => {
    if (!confirm("Excluir esta transação?")) return;
    await fetch(`/api/contabil/carteira?id=${id}`, { method: "DELETE" });
    fetchExtrato();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <header>
          <Link href="/contabil/carteira" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-brand transition-colors mb-4">
            <ArrowLeft className="h-4 w-4" /> Voltar para Carteiras
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center text-brand font-bold text-xl">
              {(data?.vendedorNome || email).substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {data?.vendedorNome || email}
              </h1>
              <p className="text-sm text-zinc-400">{email}</p>
            </div>
          </div>
        </header>

        {loading ? (
          <SkeletonTable />
        ) : data ? (
          <>
            {/* Saldo Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2"><ArrowUpRight className="h-4 w-4 text-emerald-600" /><span className="text-xs text-emerald-600 font-semibold uppercase">Créditos</span></div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{fmt(data.creditos)}</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2"><ArrowDownRight className="h-4 w-4 text-rose-600" /><span className="text-xs text-rose-600 font-semibold uppercase">Débitos</span></div>
                <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{fmt(data.debitos)}</p>
              </div>
              <div className={`rounded-2xl p-5 border ${data.saldo >= 0 ? 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800' : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'}`}>
                <div className="flex items-center gap-2 mb-2"><Wallet className="h-4 w-4 text-zinc-500" /><span className="text-xs text-zinc-500 font-semibold uppercase">Saldo Disponível</span></div>
                <p className={`text-2xl font-bold ${data.saldo >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{fmt(data.saldo)}</p>
              </div>
            </div>

            {/* Timeline de Transações */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6">
              <h3 className="font-bold text-zinc-900 dark:text-white mb-5 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-brand" /> Extrato Completo
              </h3>

              {data.transacoes.length === 0 ? (
                <p className="text-center text-zinc-400 py-12">Nenhuma transação registrada.</p>
              ) : (
                <div className="space-y-1">
                  {data.transacoes.map((t, i) => (
                    <motion.div key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                      className="flex items-center gap-4 py-3 px-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors group">
                      
                      {/* Ícone */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        t.tipo === "CREDITO" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600" : "bg-rose-100 dark:bg-rose-900/30 text-rose-600"
                      }`}>
                        {t.tipo === "CREDITO" ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900 dark:text-white text-sm truncate">{t.descricao}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 shrink-0">
                            {CATEGORIAS[t.categoria] || t.categoria}
                          </span>
                          {t.statusPagamento === "LIQUIDADO" && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 shrink-0">
                              LIQUIDADO
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-zinc-400">{fmtDate(t.createdAt)}</span>
                          {t.bancoNome && <span className="text-xs text-zinc-400">• {t.bancoNome}</span>}
                          {t.observacoes && <span className="text-xs text-zinc-400 truncate">• {t.observacoes}</span>}
                        </div>
                      </div>

                      {/* Valor */}
                      <div className={`text-right font-bold shrink-0 ${t.tipo === "CREDITO" ? "text-emerald-600" : "text-rose-600"}`}>
                        {t.tipo === "CREDITO" ? "+" : "-"} {fmt(t.valor)}
                      </div>

                      {/* Delete */}
                      <button onClick={() => excluir(t.id)} title="Excluir"
                        className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-400 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
