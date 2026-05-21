"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, Plus, X, Trash2, Edit3, AlertTriangle, CheckCircle, Clock,
  FileText, Award, Search, Building, Flame
} from "lucide-react";
import { SkeletonCards } from "@/components/ui/Skeleton";

type Doc = {
  id: string; tipo: string; nome: string; orgaoEmissor?: string; numero?: string;
  dataEmissao?: string; dataVencimento?: string; status: string; arquivoUrl?: string; observacoes?: string;
};
type Cert = {
  id: string; vendedorEmail: string; vendedorNome?: string; tipoCertificacao: string;
  numero?: string; instituicao?: string; dataEmissao?: string; dataVencimento: string;
  status: string; arquivoUrl?: string; observacoes?: string;
};

const TIPOS_DOC = [
  { value: "ALVARA", label: "Alvará de Funcionamento", icon: Building },
  { value: "AVCB", label: "AVCB (Bombeiros)", icon: Flame },
  { value: "CND_FEDERAL", label: "CND Federal" }, { value: "CND_FGTS", label: "CND FGTS" },
  { value: "CND_TRABALHISTA", label: "CND Trabalhista" }, { value: "LICENCA_SANITARIA", label: "Licença Sanitária" },
  { value: "CERTIFICADO_DIGITAL", label: "Certificado Digital" }, { value: "CONTRATO_SOCIAL", label: "Contrato Social" },
  { value: "OUTRO", label: "Outro" },
];

const TIPOS_CERT = ["CA-300", "CA-600", "ANEPS", "SUSEP", "CPA-10", "CPA-20", "OUTRO"];

function fmtDate(d: string) { return new Date(d).toLocaleDateString("pt-BR"); }
function diasAte(d: string) { return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24)); }

function StatusBadge({ status, dias }: { status: string; dias?: number }) {
  if (status === "VENCIDO" || (dias !== undefined && dias < 0))
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300">VENCIDO</span>;
  if (dias !== undefined && dias <= 15)
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300">{dias}d</span>;
  if (dias !== undefined && dias <= 30)
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">{dias}d</span>;
  if (dias !== undefined && dias <= 60)
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">{dias}d</span>;
  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">VIGENTE</span>;
}

export function RadarVencimentosClient() {
  const [tab, setTab] = useState<"docs" | "certs">("docs");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [busca, setBusca] = useState("");

  // Doc form
  const [formDoc, setFormDoc] = useState({ tipo: "ALVARA", nome: "", orgaoEmissor: "", numero: "", dataEmissao: "", dataVencimento: "", observacoes: "" });
  // Cert form
  const [formCert, setFormCert] = useState({ vendedorEmail: "", vendedorNome: "", tipoCertificacao: "CA-300", numero: "", instituicao: "FEBRABAN", dataEmissao: "", dataVencimento: "", observacoes: "" });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([fetch("/api/contabil/documentos"), fetch("/api/contabil/certificacoes")]);
      if (r1.ok) setDocs(await r1.json());
      if (r2.ok) setCerts(await r2.json());
    } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);

  const salvarDoc = async () => {
    if (!formDoc.nome) return;
    await fetch("/api/contabil/documentos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formDoc) });
    setShowModal(false); fetchAll();
  };
  const salvarCert = async () => {
    if (!formCert.vendedorEmail || !formCert.dataVencimento) return;
    await fetch("/api/contabil/certificacoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(formCert) });
    setShowModal(false); fetchAll();
  };
  const excluirDoc = async (id: string) => { if (!confirm("Excluir?")) return; await fetch(`/api/contabil/documentos?id=${id}`, { method: "DELETE" }); fetchAll(); };
  const excluirCert = async (id: string) => { if (!confirm("Excluir?")) return; await fetch(`/api/contabil/certificacoes?id=${id}`, { method: "DELETE" }); fetchAll(); };

  const vencidos = docs.filter(d => d.dataVencimento && diasAte(d.dataVencimento) < 0).length + certs.filter(c => diasAte(c.dataVencimento) < 0).length;
  const alertas = docs.filter(d => d.dataVencimento && diasAte(d.dataVencimento) >= 0 && diasAte(d.dataVencimento) <= 30).length + certs.filter(c => diasAte(c.dataVencimento) >= 0 && diasAte(c.dataVencimento) <= 30).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <ShieldAlert className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Compliance</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Radar de Vencimentos</h1>
            <p className="text-zinc-500 text-sm mt-1">Controle de alvarás, CNDs, licenças e certificações FEBRABAN dos vendedores.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 bg-brand text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 shadow-lg shadow-brand/20">
            <Plus className="h-4 w-4" /> {tab === "docs" ? "Novo Documento" : "Nova Certificação"}
          </button>
        </header>

        {/* KPIs de alerta */}
        {(vencidos > 0 || alertas > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vencidos > 0 && (
              <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
                <p className="text-sm text-rose-700 dark:text-rose-300"><strong>{vencidos}</strong> documento(s) ou certificação(ões) <strong>vencido(s)</strong>!</p>
              </div>
            )}
            {alertas > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-300"><strong>{alertas}</strong> vencendo nos próximos <strong>30 dias</strong>.</p>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 w-fit">
          <button onClick={() => setTab("docs")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === "docs" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500"}`}>
            <FileText className="h-4 w-4 inline mr-1.5" />Documentos ({docs.length})
          </button>
          <button onClick={() => setTab("certs")} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${tab === "certs" ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500"}`}>
            <Award className="h-4 w-4 inline mr-1.5" />Certificações ({certs.length})
          </button>
        </div>

        {loading ? (
          <SkeletonCards />
        ) : tab === "docs" ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                <th className="text-left py-3 px-4 text-zinc-400 font-semibold">Documento</th>
                <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Tipo</th>
                <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Órgão</th>
                <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Vencimento</th>
                <th className="text-center py-3 px-2 text-zinc-400 font-semibold">Status</th>
                <th className="text-center py-3 px-4 text-zinc-400 font-semibold">Ação</th>
              </tr></thead>
              <tbody>
                {docs.length === 0 ? <tr><td colSpan={6} className="py-16 text-center text-zinc-400">Nenhum documento cadastrado.</td></tr> :
                docs.map((d, i) => {
                  const dias = d.dataVencimento ? diasAte(d.dataVencimento) : 999;
                  return (
                    <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className={`border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors ${dias < 0 ? 'bg-rose-50/50 dark:bg-rose-950/10' : dias <= 30 ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}>
                      <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">{d.nome}</td>
                      <td className="py-3 px-2 text-xs text-zinc-500">{TIPOS_DOC.find(t => t.value === d.tipo)?.label || d.tipo}</td>
                      <td className="py-3 px-2 text-xs text-zinc-500">{d.orgaoEmissor || "—"}</td>
                      <td className="py-3 px-2 text-xs text-zinc-500">{d.dataVencimento ? fmtDate(d.dataVencimento) : "Indeterminado"}</td>
                      <td className="py-3 px-2 text-center"><StatusBadge status={d.status} dias={d.dataVencimento ? dias : undefined} /></td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => excluirDoc(d.id)} className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-400"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                <th className="text-left py-3 px-4 text-zinc-400 font-semibold">Vendedor</th>
                <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Certificação</th>
                <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Instituição</th>
                <th className="text-left py-3 px-2 text-zinc-400 font-semibold">Vencimento</th>
                <th className="text-center py-3 px-2 text-zinc-400 font-semibold">Status</th>
                <th className="text-center py-3 px-4 text-zinc-400 font-semibold">Ação</th>
              </tr></thead>
              <tbody>
                {certs.length === 0 ? <tr><td colSpan={6} className="py-16 text-center text-zinc-400">Nenhuma certificação cadastrada.</td></tr> :
                certs.map((c, i) => {
                  const dias = diasAte(c.dataVencimento);
                  return (
                    <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className={`border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors ${dias < 0 ? 'bg-rose-50/50 dark:bg-rose-950/10' : dias <= 30 ? 'bg-amber-50/30 dark:bg-amber-950/10' : ''}`}>
                      <td className="py-3 px-4"><div className="font-medium text-zinc-900 dark:text-white">{c.vendedorNome || c.vendedorEmail}</div><div className="text-xs text-zinc-400">{c.vendedorEmail}</div></td>
                      <td className="py-3 px-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">{c.tipoCertificacao}</td>
                      <td className="py-3 px-2 text-xs text-zinc-500">{c.instituicao || "—"}</td>
                      <td className="py-3 px-2 text-xs text-zinc-500">{fmtDate(c.dataVencimento)}</td>
                      <td className="py-3 px-2 text-center"><StatusBadge status={c.status} dias={dias} /></td>
                      <td className="py-3 px-4 text-center">
                        <button onClick={() => excluirCert(c.id)} className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-400"><Trash2 className="h-4 w-4" /></button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{tab === "docs" ? "Novo Documento Regulatório" : "Nova Certificação"}</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
                </div>

                {tab === "docs" ? (
                  <div className="space-y-4">
                    <select value={formDoc.tipo} onChange={e => setFormDoc(f => ({ ...f, tipo: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none">
                      {TIPOS_DOC.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <input type="text" placeholder="Nome (ex: Alvará 2026)" value={formDoc.nome} onChange={e => setFormDoc(f => ({ ...f, nome: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                    <input type="text" placeholder="Órgão Emissor" value={formDoc.orgaoEmissor} onChange={e => setFormDoc(f => ({ ...f, orgaoEmissor: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                    <input type="text" placeholder="Número do documento" value={formDoc.numero} onChange={e => setFormDoc(f => ({ ...f, numero: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs text-zinc-400 mb-1 block">Emissão</label>
                        <input type="date" value={formDoc.dataEmissao} onChange={e => setFormDoc(f => ({ ...f, dataEmissao: e.target.value }))}
                          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" /></div>
                      <div><label className="text-xs text-zinc-400 mb-1 block">Vencimento</label>
                        <input type="date" value={formDoc.dataVencimento} onChange={e => setFormDoc(f => ({ ...f, dataVencimento: e.target.value }))}
                          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" /></div>
                    </div>
                    <textarea placeholder="Observações" rows={2} value={formDoc.observacoes} onChange={e => setFormDoc(f => ({ ...f, observacoes: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none resize-none" />
                    <button onClick={salvarDoc} className="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-brand/20">Cadastrar Documento</button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <input type="email" placeholder="E-mail do vendedor" value={formCert.vendedorEmail} onChange={e => setFormCert(f => ({ ...f, vendedorEmail: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                    <input type="text" placeholder="Nome do vendedor" value={formCert.vendedorNome} onChange={e => setFormCert(f => ({ ...f, vendedorNome: e.target.value }))}
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                    <div className="grid grid-cols-2 gap-3">
                      <select value={formCert.tipoCertificacao} onChange={e => setFormCert(f => ({ ...f, tipoCertificacao: e.target.value }))}
                        className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none">
                        {TIPOS_CERT.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <input type="text" placeholder="Instituição" value={formCert.instituicao} onChange={e => setFormCert(f => ({ ...f, instituicao: e.target.value }))}
                        className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs text-zinc-400 mb-1 block">Emissão</label>
                        <input type="date" value={formCert.dataEmissao} onChange={e => setFormCert(f => ({ ...f, dataEmissao: e.target.value }))}
                          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" /></div>
                      <div><label className="text-xs text-zinc-400 mb-1 block">Vencimento</label>
                        <input type="date" value={formCert.dataVencimento} onChange={e => setFormCert(f => ({ ...f, dataVencimento: e.target.value }))}
                          className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" /></div>
                    </div>
                    <button onClick={salvarCert} className="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-brand/20">Cadastrar Certificação</button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
