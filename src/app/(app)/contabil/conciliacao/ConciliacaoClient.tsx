"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Building2, Upload, CheckCircle, AlertTriangle, XCircle, ArrowRight, FileSpreadsheet, RefreshCcw } from "lucide-react";

type ContaBancaria = { id: string; nomeBanco: string; cor?: string | null };
type LinhaResultado = {
  dataExtrato: string; descricaoExtrato: string; valorExtrato: number; tipo: string;
  statusConciliacao: string; divergencia: string | null;
  lancamentoId: string | null; lancamentoDescricao: string | null; lancamentoValor: number | null;
  categoriaNome: string | null;
};
type Resultado = {
  contaBancaria: string; totalLinhas: number; conciliados: number; divergentes: number;
  pendentes: number; taxaConciliacao: number; resultado: LinhaResultado[];
};

function fmt(v: number) { return Math.abs(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

const STATUS_STYLE: Record<string, { bg: string; icon: any; label: string }> = {
  CONCILIADO: { bg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300", icon: CheckCircle, label: "Conciliado" },
  DIVERGENTE: { bg: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300", icon: AlertTriangle, label: "Divergente" },
  PENDENTE: { bg: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300", icon: XCircle, label: "Pendente" },
};

export function ConciliacaoClient() {
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [contaId, setContaId] = useState("");
  const [csvText, setCsvText] = useState("");
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [loading, setLoading] = useState(false);
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    fetch("/api/contabil/contas-bancarias").then(r => r.json()).then(setContas).catch(() => {});
  }, []);

  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (lines.length < 2) return [];
    // Detectar separador
    const sep = lines[0].includes(";") ? ";" : ",";
    const header = lines[0].split(sep).map(h => h.trim().toLowerCase().replace(/"/g, ""));
    const dataIdx = header.findIndex(h => h.includes("data"));
    const descIdx = header.findIndex(h => h.includes("desc") || h.includes("hist"));
    const valorIdx = header.findIndex(h => h.includes("valor") || h.includes("amount"));

    return lines.slice(1).map(line => {
      const cols = line.split(sep).map(c => c.trim().replace(/"/g, ""));
      return {
        data: cols[dataIdx] || "",
        descricao: cols[descIdx] || "",
        valor: parseFloat((cols[valorIdx] || "0").replace(",", ".")) || 0,
      };
    }).filter(l => l.data && l.valor !== 0);
  }, []);

  const handleConciliar = async () => {
    if (!contaId || !csvText) return;
    const linhas = parseCSV(csvText);
    if (linhas.length === 0) return alert("Nenhuma linha válida encontrada no CSV.");
    setLoading(true);
    try {
      const r = await fetch("/api/contabil/conciliacao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contaBancariaId: contaId, linhas }),
      });
      if (r.ok) setResultado(await r.json());
    } catch {}
    setLoading(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvText(ev.target?.result as string || "");
    reader.readAsText(file);
  };

  const filtered = resultado?.resultado.filter(r => !filtro || r.statusConciliacao === filtro) || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <header>
          <div className="flex items-center gap-2 text-brand mb-1"><Building2 className="h-5 w-5" /><span className="text-xs uppercase tracking-widest font-semibold">Conciliação</span></div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Conciliação Bancária</h1>
          <p className="text-zinc-500 text-sm mt-1">Cole ou importe o extrato CSV do banco para cruzar automaticamente com seus lançamentos.</p>
        </header>

        {/* Input */}
        {!resultado && (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Conta Bancária</label>
                <select value={contaId} onChange={e => setContaId(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none">
                  <option value="">Selecionar conta...</option>
                  {contas.map(c => <option key={c.id} value={c.id}>{c.nomeBanco}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Arquivo CSV</label>
                <label className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700">
                  <Upload className="h-4 w-4 text-zinc-400" />
                  <span className="text-zinc-500">{csvText ? "Arquivo carregado ✓" : "Importar CSV..."}</span>
                  <input type="file" accept=".csv,.txt,.ofx" className="hidden" onChange={handleFile} />
                </label>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">Ou cole o extrato aqui</label>
              <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
                rows={6} placeholder={"Data;Descrição;Valor\n15/05/2026;Pagamento Aluguel;-3500.00\n16/05/2026;Recebimento Cliente X;12000.00"}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm font-mono outline-none resize-none" />
            </div>
            <button onClick={handleConciliar} disabled={!contaId || !csvText || loading}
              className="w-full bg-brand hover:bg-brand/90 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
              {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {loading ? "Processando..." : "Conciliar Extrato"}
            </button>
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total", value: resultado.totalLinhas, color: "text-zinc-900 dark:text-white", f: "" },
                { label: "Conciliados", value: resultado.conciliados, color: "text-emerald-600", f: "CONCILIADO" },
                { label: "Divergentes", value: resultado.divergentes, color: "text-amber-600", f: "DIVERGENTE" },
                { label: "Pendentes", value: resultado.pendentes, color: "text-rose-600", f: "PENDENTE" },
              ].map((s, i) => (
                <button key={i} onClick={() => setFiltro(filtro === s.f ? "" : s.f)}
                  className={`bg-white dark:bg-zinc-900 rounded-2xl border p-4 text-center transition-all ${filtro === s.f ? "border-brand ring-2 ring-brand/20" : "border-zinc-200 dark:border-zinc-800"}`}>
                  <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-zinc-400">{s.label}</p>
                </button>
              ))}
            </div>

            {/* Taxa */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Taxa de Conciliação</span>
                <span className={`text-lg font-bold ${resultado.taxaConciliacao >= 80 ? "text-emerald-600" : resultado.taxaConciliacao >= 50 ? "text-amber-600" : "text-rose-600"}`}>{resultado.taxaConciliacao}%</span>
              </div>
              <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${resultado.taxaConciliacao}%` }} transition={{ duration: 0.8 }}
                  className={`h-full rounded-full ${resultado.taxaConciliacao >= 80 ? "bg-emerald-500" : resultado.taxaConciliacao >= 50 ? "bg-amber-500" : "bg-rose-500"}`} />
              </div>
            </div>

            {/* Tabela */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                      <th className="px-4 py-3 text-left text-xs text-zinc-500 font-semibold">Data</th>
                      <th className="px-4 py-3 text-left text-xs text-zinc-500 font-semibold">Extrato</th>
                      <th className="px-4 py-3 text-right text-xs text-zinc-500 font-semibold">Valor</th>
                      <th className="px-4 py-3 text-center text-xs text-zinc-500 font-semibold">Status</th>
                      <th className="px-4 py-3 text-left text-xs text-zinc-500 font-semibold">Lançamento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                    {filtered.map((r, i) => {
                      const st = STATUS_STYLE[r.statusConciliacao];
                      return (
                        <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/20">
                          <td className="px-4 py-2.5 text-xs text-zinc-500">{r.dataExtrato}</td>
                          <td className="px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 max-w-[200px] truncate">{r.descricaoExtrato}</td>
                          <td className={`px-4 py-2.5 text-xs font-bold text-right ${r.valorExtrato >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{fmt(r.valorExtrato)}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.bg}`}>
                              <st.icon className="h-3 w-3" /> {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            {r.lancamentoDescricao ? (
                              <div className="flex items-center gap-2">
                                <ArrowRight className="h-3 w-3 text-zinc-400 shrink-0" />
                                <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[180px]">{r.lancamentoDescricao}</span>
                                {r.divergencia && <span className="text-[9px] text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">{r.divergencia}</span>}
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-300">—</span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <button onClick={() => { setResultado(null); setCsvText(""); setFiltro(""); }}
              className="text-sm text-brand hover:underline font-semibold">
              ← Nova conciliação
            </button>
          </>
        )}
      </div>
    </div>
  );
}
