"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileSpreadsheet, CheckCircle, XCircle, AlertTriangle,
  Trash2, Eye, X, Search, Brain, Loader2
} from "lucide-react";
import { SkeletonTable } from "@/components/ui/Skeleton";

type Bordero = {
  id: string; bancoNome: string; nomeArquivo: string; totalLinhas: number; totalValor: number;
  matchEncontrados: number; matchNaoEncontrados: number; status: string; createdAt: string;
};
type Linha = {
  id: string; cpfCliente?: string; nomeCliente?: string; contrato?: string;
  valorLiberado?: number; valorComissao?: number; produto?: string;
  statusMatch: string; scoreSimilaridade?: number; divergencia?: string;
};

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }); }

export function BorderoClient() {
  const [borderos, setBorderos] = useState<Bordero[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [loadingLinhas, setLoadingLinhas] = useState(false);
  const [formBanco, setFormBanco] = useState("Banco PAN");
  const [csvText, setCsvText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchBorderos = async () => {
    setLoading(true);
    try { const r = await fetch("/api/contabil/bordero"); if (r.ok) setBorderos(await r.json()); } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchBorderos(); }, []);

  const verDetalhes = async (id: string) => {
    setShowDetail(id);
    setLoadingLinhas(true);
    try { const r = await fetch(`/api/contabil/bordero/linhas?borderoId=${id}`); if (r.ok) setLinhas(await r.json()); } catch {}
    setLoadingLinhas(false);
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir este borderô?")) return;
    await fetch(`/api/contabil/bordero?id=${id}`, { method: "DELETE" });
    fetchBorderos();
  };

  // Parsear CSV colado manualmente
  const processarCSV = async () => {
    if (!csvText.trim()) return;
    setUploading(true);
    try {
      const rows = csvText.trim().split("\n").slice(1); // Pular header
      const linhas = rows.map(row => {
        const cols = row.split(";").map(c => c.trim());
        return {
          cpfCliente: cols[0] || "",
          nomeCliente: cols[1] || "",
          contrato: cols[2] || "",
          valorLiberado: parseFloat(cols[3]?.replace(",", ".")) || 0,
          valorComissao: parseFloat(cols[4]?.replace(",", ".")) || 0,
          produto: cols[5] || "",
        };
      }).filter(l => l.cpfCliente || l.nomeCliente);

      const res = await fetch("/api/contabil/bordero", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bancoNome: formBanco, nomeArquivo: `bordero_manual_${Date.now()}.csv`, linhas }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`Borderô processado!\n✅ ${data.matchEncontrados} matches encontrados\n❌ ${data.matchNaoEncontrados} não encontrados\n💰 Total: ${fmt(data.totalValor)}`);
        setCsvText("");
        setShowUpload(false);
        fetchBorderos();
      }
    } catch { alert("Erro ao processar"); }
    setUploading(false);
  };

  const matchColor = (status: string) => {
    if (status === "MATCH_EXATO") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300";
    if (status === "MATCH_FUZZY") return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
    if (status === "DIVERGENCIA") return "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300";
    if (status === "NAO_ENCONTRADO") return "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300";
    return "bg-zinc-100 text-zinc-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1"><Brain className="h-5 w-5" /><span className="text-xs uppercase tracking-widest font-semibold">Auditoria Inteligente</span></div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Motor de Borderô</h1>
            <p className="text-zinc-500 text-sm mt-1">Importe extratos dos bancos e o sistema cruza automaticamente com as propostas da Esteira (Fuzzy Match).</p>
          </div>
          <button onClick={() => setShowUpload(true)} className="flex items-center gap-2 bg-brand text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 shadow-lg shadow-brand/20">
            <Upload className="h-4 w-4" /> Importar Borderô
          </button>
        </header>

        {/* Lista de Borderôs */}
        {loading ? (
          <SkeletonTable />
        ) : borderos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <FileSpreadsheet className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-zinc-400">Nenhum borderô importado ainda.</p>
            <p className="text-xs text-zinc-400 mt-1">Cole o extrato CSV do banco para iniciar a auditoria automática.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {borderos.map((b, i) => {
              const pctMatch = b.totalLinhas > 0 ? (b.matchEncontrados / b.totalLinhas) * 100 : 0;
              return (
                <motion.div key={b.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm group relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center"><FileSpreadsheet className="h-5 w-5 text-brand" /></div>
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-sm">{b.bancoNome}</h3>
                        <p className="text-[11px] text-zinc-400">{fmtDate(b.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => verDetalhes(b.id)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => excluir(b.id)} className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-zinc-400">Linhas</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{b.totalLinhas}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Valor Total</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{fmt(b.totalValor)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Matches</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600 font-bold">✅ {b.matchEncontrados}</span>
                        <span className="text-rose-600 font-bold">❌ {b.matchNaoEncontrados}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pctMatch}%` }} />
                    </div>
                    <p className="text-[10px] text-zinc-400 text-right">{pctMatch.toFixed(0)}% de acerto</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Modal Upload */}
        <AnimatePresence>
          {showUpload && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowUpload(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Importar Borderô Bancário</h2>
                  <button onClick={() => setShowUpload(false)} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4">
                  <select value={formBanco} onChange={e => setFormBanco(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none">
                    <option>Banco PAN</option><option>BMG</option><option>Itaú Consignado</option>
                    <option>Bradesco</option><option>Safra</option><option>Master</option>
                    <option>C6 Bank</option><option>Daycoval</option><option>Outro</option>
                  </select>
                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block">
                      Cole o CSV do borderô abaixo (formato: CPF;Nome;Contrato;Valor Liberado;Comissão;Produto)
                    </label>
                    <textarea value={csvText} onChange={e => setCsvText(e.target.value)} rows={12}
                      placeholder={"CPF;Nome;Contrato;Valor Liberado;Comissão;Produto\n12345678901;João Silva;CT-001;15000;450;Consignado\n98765432100;Maria Santos;CT-002;8000;240;FGTS"}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none resize-none font-mono" />
                  </div>
                  <button onClick={processarCSV} disabled={uploading || !csvText.trim()}
                    className="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-brand/20 disabled:opacity-50 flex items-center justify-center gap-2">
                    {uploading ? <><Loader2 className="h-4 w-4 animate-spin" /> Processando Fuzzy Match...</> : <><Brain className="h-4 w-4" /> Processar Borderô</>}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Detalhes */}
        <AnimatePresence>
          {showDetail && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => { setShowDetail(null); setLinhas([]); }}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Linhas do Borderô</h2>
                  <button onClick={() => { setShowDetail(null); setLinhas([]); }} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
                </div>
                {loadingLinhas ? (
                  <SkeletonTable />
                ) : (
                  <table className="w-full text-xs">
                    <thead><tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <th className="text-left py-2 px-2 text-zinc-400">CPF</th>
                      <th className="text-left py-2 px-2 text-zinc-400">Nome</th>
                      <th className="text-left py-2 px-2 text-zinc-400">Contrato</th>
                      <th className="text-right py-2 px-2 text-zinc-400">Comissão</th>
                      <th className="text-center py-2 px-2 text-zinc-400">Match</th>
                      <th className="text-center py-2 px-2 text-zinc-400">Score</th>
                      <th className="text-left py-2 px-2 text-zinc-400">Divergência</th>
                    </tr></thead>
                    <tbody>
                      {linhas.map(l => (
                        <tr key={l.id} className="border-b border-zinc-50 dark:border-zinc-800/50">
                          <td className="py-2 px-2 font-mono text-zinc-600">{l.cpfCliente || "—"}</td>
                          <td className="py-2 px-2 text-zinc-700 dark:text-zinc-300">{l.nomeCliente || "—"}</td>
                          <td className="py-2 px-2 text-zinc-500">{l.contrato || "—"}</td>
                          <td className="py-2 px-2 text-right font-bold text-zinc-700 dark:text-zinc-300">{l.valorComissao ? fmt(l.valorComissao) : "—"}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${matchColor(l.statusMatch)}`}>
                              {l.statusMatch.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-center font-bold text-zinc-500">{l.scoreSimilaridade?.toFixed(0)}%</td>
                          <td className="py-2 px-2 text-amber-600 text-[11px]">{l.divergencia || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
