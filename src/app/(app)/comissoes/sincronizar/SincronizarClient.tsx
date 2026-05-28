"use client";
import { useState, useEffect, useCallback } from "react";
import {
  RefreshCw, KeyRound, Building2, Clock, CheckCircle2, XCircle,
  Loader2, Eye, EyeOff, Save, Zap, History, AlertTriangle,
  ChevronDown, ChevronUp, Plus, X, Settings, Download, ArrowLeft,
  Shield, Timer, ToggleLeft, ToggleRight, TrendingUp, Sparkles
} from "lucide-react";
import Link from "next/link";

type BancoConfig = {
  financeira: string;
  convenio: string;
  formaContrato: string;
  ativo: boolean;
  ultimaSync?: string;
  tabelasCount?: number;
};

type SyncLog = {
  id: string;
  financeira: string;
  convenio: string;
  formaContrato: string;
  status: string;
  tabelasTotal: number;
  inseridas: number;
  atualizadas: number;
  erro: string | null;
  tempoMs: number;
  createdAt: string;
};

type SyncConfig = {
  loginBevi: string;
  senhaBevi: string;
  senhaRelatorio: string;
  bancosSelecionados: BancoConfig[];
  ultimaSync: string | null;
  statusSync: string;
  erroSync: string | null;
  syncAutomatico: boolean;
  horarioSync: string;
};

const BANCOS_DISPONIVEIS: BancoConfig[] = [
  { financeira: "FACTA", convenio: "INSS", formaContrato: "Novo", ativo: false },
  { financeira: "FACTA", convenio: "INSS", formaContrato: "Refin", ativo: false },
  { financeira: "FACTA", convenio: "INSS", formaContrato: "Port", ativo: false },
  { financeira: "PAN", convenio: "INSS", formaContrato: "Novo", ativo: false },
  { financeira: "PAN", convenio: "INSS", formaContrato: "Refin", ativo: false },
  { financeira: "BMG", convenio: "INSS", formaContrato: "Novo", ativo: false },
  { financeira: "BMG", convenio: "INSS", formaContrato: "Refin", ativo: false },
  { financeira: "OLÉ", convenio: "INSS", formaContrato: "Novo", ativo: false },
  { financeira: "SAFRA", convenio: "INSS", formaContrato: "Novo", ativo: false },
  { financeira: "MASTER", convenio: "INSS", formaContrato: "Novo", ativo: false },
  { financeira: "C6", convenio: "INSS", formaContrato: "Novo", ativo: false },
  { financeira: "ITAÚ", convenio: "INSS", formaContrato: "Novo", ativo: false },
];

const financeiraCores: Record<string, string> = {
  FACTA: "from-blue-500 to-blue-700",
  PAN: "from-orange-500 to-orange-700",
  BMG: "from-green-500 to-green-700",
  "OLÉ": "from-purple-500 to-purple-700",
  SAFRA: "from-yellow-500 to-yellow-700",
  MASTER: "from-red-500 to-red-700",
  C6: "from-gray-700 to-gray-900",
  "ITAÚ": "from-cyan-500 to-cyan-700",
};

function formatDate(d: string | null) {
  if (!d) return "Nunca";
  return new Date(d).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function SincronizarClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null); // null or financeira being synced
  const [syncingAll, setSyncingAll] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [showSenha, setShowSenha] = useState(false);
  const [showSenhaRel, setShowSenhaRel] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Form
  const [loginBevi, setLoginBevi] = useState("");
  const [senhaBevi, setSenhaBevi] = useState("");
  const [senhaRelatorio, setSenhaRelatorio] = useState("");
  const [bancos, setBancos] = useState<BancoConfig[]>(BANCOS_DISPONIVEIS);
  const [syncAutomatico, setSyncAutomatico] = useState(false);
  const [horarioSync, setHorarioSync] = useState("06:00");
  const [ultimaSync, setUltimaSync] = useState<string | null>(null);
  const [statusSync, setStatusSync] = useState("idle");
  const [historico, setHistorico] = useState<SyncLog[]>([]);

  const showToast = useCallback((msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  }, []);

  // Load config
  useEffect(() => {
    fetch("/api/sync-tabelas/config")
      .then(r => r.json())
      .then(data => {
        if (data.configured && data.config) {
          setConfigured(true);
          setLoginBevi(data.config.loginBevi || "");
          setSenhaBevi(data.config.senhaBevi || "");
          setSenhaRelatorio(data.config.senhaRelatorio || "");
          setSyncAutomatico(data.config.syncAutomatico || false);
          setHorarioSync(data.config.horarioSync || "06:00");
          setUltimaSync(data.config.ultimaSync);
          setStatusSync(data.config.statusSync);

          // Merge saved banks with available
          const saved = data.config.bancosSelecionados as BancoConfig[];
          const merged = BANCOS_DISPONIVEIS.map(b => {
            const s = saved.find(
              (s: BancoConfig) => s.financeira === b.financeira && s.convenio === b.convenio && s.formaContrato === b.formaContrato
            );
            return s ? { ...b, ...s } : b;
          });
          setBancos(merged);
        }
        if (data.historico) setHistorico(data.historico);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Save config
  async function salvarConfig() {
    setSaving(true);
    try {
      const res = await fetch("/api/sync-tabelas/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginBevi, senhaBevi, senhaRelatorio,
          bancosSelecionados: bancos,
          syncAutomatico, horarioSync,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfigured(true);
      showToast("Configuração salva com sucesso!", "success");
    } catch (err: any) {
      showToast(err.message || "Erro ao salvar", "error");
    }
    setSaving(false);
  }

  // Execute sync
  async function executarSync(financeira?: string) {
    if (financeira) setSyncing(financeira); else setSyncingAll(true);
    try {
      const res = await fetch("/api/sync-tabelas/executar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financeira }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUltimaSync(new Date().toISOString());
      setStatusSync(data.success ? "success" : "error");
      showToast(data.message, data.success ? "success" : "error");

      // Reload historico
      const configRes = await fetch("/api/sync-tabelas/config");
      const configData = await configRes.json();
      if (configData.historico) setHistorico(configData.historico);
    } catch (err: any) {
      showToast(err.message || "Erro na sincronização", "error");
      setStatusSync("error");
    }
    setSyncing(null);
    setSyncingAll(false);
  }

  function toggleBanco(idx: number) {
    setBancos(prev => prev.map((b, i) => i === idx ? { ...b, ativo: !b.ativo } : b));
  }

  const bancosAtivos = bancos.filter(b => b.ativo);
  const isAnySyncing = syncing !== null || syncingAll;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right ${
            toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}>
            {toast.type === "success" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            <span className="text-sm font-medium">{toast.msg}</span>
            <button onClick={() => setToast(null)}><X className="h-4 w-4 opacity-70" /></button>
          </div>
        )}

        {/* Header */}
        <header>
          <Link href="/comissoes" className="text-xs text-zinc-500 hover:text-brand flex items-center gap-1 mb-3 transition">
            <ArrowLeft className="h-3 w-3" /> Voltar para Comissões
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5">
              <RefreshCw className="h-6 w-6 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sincronizar Tabelas</h1>
              <p className="text-sm text-zinc-500 mt-0.5">Importe automaticamente as tabelas de comissão via Bevi</p>
            </div>
          </div>
        </header>

        {/* Status Banner */}
        {ultimaSync && (
          <div className={`rounded-2xl p-4 flex items-center gap-4 ${
            statusSync === "success" ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900" :
            statusSync === "error" ? "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900" :
            statusSync === "running" ? "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900" :
            "bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
          }`}>
            {statusSync === "success" && <CheckCircle2 className="h-6 w-6 text-emerald-500 shrink-0" />}
            {statusSync === "error" && <XCircle className="h-6 w-6 text-red-500 shrink-0" />}
            {statusSync === "running" && <Loader2 className="h-6 w-6 text-blue-500 animate-spin shrink-0" />}
            {statusSync === "idle" && <Clock className="h-6 w-6 text-zinc-400 shrink-0" />}
            <div className="flex-1">
              <p className="text-sm font-semibold">
                {statusSync === "success" ? "Última sincronização concluída" :
                 statusSync === "error" ? "Erro na última sincronização" :
                 statusSync === "running" ? "Sincronização em andamento..." :
                 "Configurado"}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                <Clock className="h-3 w-3 inline mr-1" />
                {formatDate(ultimaSync)}
              </p>
            </div>
          </div>
        )}

        {/* Credentials Card */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-amber-500" />
            <h2 className="font-bold">Credenciais Bevi</h2>
            <Shield className="h-4 w-4 text-zinc-300 ml-auto" />
            <span className="text-[10px] text-zinc-400 font-medium">Criptografado AES-256</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">Login Bevi</label>
                <input
                  value={loginBevi}
                  onChange={e => setLoginBevi(e.target.value)}
                  placeholder="SUB67-103060"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-mono focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">Senha</label>
                <div className="relative">
                  <input
                    type={showSenha ? "text" : "password"}
                    value={senhaBevi}
                    onChange={e => setSenhaBevi(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition"
                  />
                  <button onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">Senha de Relatório</label>
                <div className="relative">
                  <input
                    type={showSenhaRel ? "text" : "password"}
                    value={senhaRelatorio}
                    onChange={e => setSenhaRelatorio(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition"
                  />
                  <button onClick={() => setShowSenhaRel(!showSenhaRel)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    {showSenhaRel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Auto Sync Toggle */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <button onClick={() => setSyncAutomatico(!syncAutomatico)} className="shrink-0">
                {syncAutomatico
                  ? <ToggleRight className="h-7 w-7 text-brand" />
                  : <ToggleLeft className="h-7 w-7 text-zinc-400" />
                }
              </button>
              <div className="flex-1">
                <p className="text-sm font-semibold">Sincronização Automática Diária</p>
                <p className="text-xs text-zinc-500">Sincroniza todas as tabelas selecionadas automaticamente</p>
              </div>
              {syncAutomatico && (
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-zinc-400" />
                  <input
                    type="time"
                    value={horarioSync}
                    onChange={e => setHorarioSync(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={salvarConfig}
                disabled={saving || !loginBevi}
                className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 disabled:opacity-40 transition"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar Configuração
              </button>
            </div>
          </div>
        </div>

        {/* Banks Selection */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
            <Building2 className="h-5 w-5 text-blue-500" />
            <h2 className="font-bold">Bancos para Sincronizar</h2>
            <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-brand/10 text-brand font-semibold">
              {bancosAtivos.length} selecionados
            </span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bancos.map((banco, idx) => {
              const cor = financeiraCores[banco.financeira] || "from-zinc-500 to-zinc-700";
              const isSyncingThis = syncing === banco.financeira;
              const lastLog = historico.find(
                h => h.financeira === banco.financeira && h.convenio === banco.convenio && h.formaContrato === banco.formaContrato
              );

              return (
                <div
                  key={`${banco.financeira}-${banco.convenio}-${banco.formaContrato}`}
                  className={`rounded-xl border p-4 transition-all cursor-pointer ${
                    banco.ativo
                      ? "border-brand/30 bg-brand/5 dark:bg-brand/5 ring-1 ring-brand/20"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                  }`}
                  onClick={() => toggleBanco(idx)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      {banco.financeira.substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm">{banco.financeira}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-medium">
                          {banco.convenio}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-0.5">{banco.formaContrato}</p>
                      {lastLog && (
                        <div className="flex items-center gap-1 mt-1.5">
                          {lastLog.status === "success"
                            ? <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            : <XCircle className="h-3 w-3 text-red-500" />
                          }
                          <span className="text-[10px] text-zinc-400">
                            {lastLog.tabelasTotal} tabelas · {formatDate(lastLog.createdAt)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                      banco.ativo ? "border-brand bg-brand" : "border-zinc-300 dark:border-zinc-600"
                    }`}>
                      {banco.ativo && <CheckCircle2 className="h-3 w-3 text-white" />}
                    </div>
                  </div>

                  {/* Sync button (only for active banks when config is saved) */}
                  {banco.ativo && configured && (
                    <button
                      onClick={(e) => { e.stopPropagation(); executarSync(banco.financeira); }}
                      disabled={isAnySyncing}
                      className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 transition"
                    >
                      {isSyncingThis
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sincronizando...</>
                        : <><RefreshCw className="h-3.5 w-3.5" /> Sincronizar</>
                      }
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sync All Button */}
          {bancosAtivos.length > 0 && configured && (
            <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <p className="text-xs text-zinc-500">
                <TrendingUp className="h-3.5 w-3.5 inline mr-1" />
                Tempo estimado: ~{bancosAtivos.length * 2} minutos
              </p>
              <button
                onClick={() => executarSync()}
                disabled={isAnySyncing}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand/80 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 disabled:opacity-40 transition"
              >
                {syncingAll
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Sincronizando {bancosAtivos.length} bancos...</>
                  : <><Zap className="h-4 w-4" /> Sincronizar Todos ({bancosAtivos.length})</>
                }
              </button>
            </div>
          )}
        </div>

        {/* History */}
        {historico.length > 0 && (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full px-6 py-4 flex items-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition"
            >
              <History className="h-5 w-5 text-violet-500" />
              <h2 className="font-bold">Histórico de Sincronizações</h2>
              <span className="ml-auto text-xs text-zinc-400">{historico.length} registros</span>
              {showHistory ? <ChevronUp className="h-4 w-4 text-zinc-400" /> : <ChevronDown className="h-4 w-4 text-zinc-400" />}
            </button>
            {showHistory && (
              <div className="border-t border-zinc-100 dark:border-zinc-800">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-800/40">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-zinc-500 font-semibold">Data</th>
                      <th className="px-4 py-2.5 text-left text-zinc-500 font-semibold">Banco</th>
                      <th className="px-4 py-2.5 text-left text-zinc-500 font-semibold">Convênio</th>
                      <th className="px-4 py-2.5 text-center text-zinc-500 font-semibold">Status</th>
                      <th className="px-4 py-2.5 text-right text-zinc-500 font-semibold">Tabelas</th>
                      <th className="px-4 py-2.5 text-right text-zinc-500 font-semibold">Tempo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {historico.map(log => (
                      <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
                        <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{formatDate(log.createdAt)}</td>
                        <td className="px-4 py-2.5 font-semibold">{log.financeira}</td>
                        <td className="px-4 py-2.5">{log.convenio} · {log.formaContrato}</td>
                        <td className="px-4 py-2.5 text-center">
                          {log.status === "success"
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold">
                                <CheckCircle2 className="h-3 w-3" /> OK
                              </span>
                            : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-[10px] font-bold" title={log.erro || ""}>
                                <XCircle className="h-3 w-3" /> Erro
                              </span>
                          }
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {log.tabelasTotal > 0 && (
                            <span>
                              {log.tabelasTotal}
                              <span className="text-zinc-400 ml-1">({log.inseridas}↑ {log.atualizadas}↻)</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-zinc-500">
                          {(log.tempoMs / 1000).toFixed(0)}s
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
