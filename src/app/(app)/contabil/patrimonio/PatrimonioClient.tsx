"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plus, X, Trash2, Edit3, Monitor, Armchair, Car, Zap,
  Search, TrendingDown, DollarSign
} from "lucide-react";

type Ativo = {
  id: string; nome: string; categoria: string; numeroPatrimonio?: string; numeroSerie?: string;
  marca?: string; modelo?: string; dataAquisicao: string; valorAquisicao: number;
  vidaUtilMeses: number; taxaDepreciacao: number; responsavelEmail?: string; responsavelNome?: string;
  localizacao?: string; status: string; observacoes?: string;
  mesesUso: number; depreciacaoAcumulada: number; valorResidual: number;
};

const CATEGORIAS = [
  { value: "INFORMATICA", label: "Informática", icon: Monitor },
  { value: "MOVEIS", label: "Móveis", icon: Armchair },
  { value: "ELETRODOMESTICO", label: "Eletrodoméstico", icon: Zap },
  { value: "VEICULOS", label: "Veículos", icon: Car },
  { value: "OUTRO", label: "Outro", icon: Package },
];

function fmt(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }

export function PatrimonioClient() {
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Ativo | null>(null);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({
    nome: "", categoria: "INFORMATICA", numeroPatrimonio: "", numeroSerie: "", marca: "", modelo: "",
    dataAquisicao: "", valorAquisicao: "", vidaUtilMeses: "60", taxaDepreciacao: "20",
    responsavelEmail: "", responsavelNome: "", localizacao: "", observacoes: "",
  });

  const fetchAtivos = async () => {
    setLoading(true);
    try { const r = await fetch("/api/contabil/patrimonio"); if (r.ok) setAtivos(await r.json()); } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchAtivos(); }, []);

  const abrirNovo = () => {
    setEditando(null);
    setForm({ nome: "", categoria: "INFORMATICA", numeroPatrimonio: "", numeroSerie: "", marca: "", modelo: "", dataAquisicao: new Date().toISOString().split("T")[0], valorAquisicao: "", vidaUtilMeses: "60", taxaDepreciacao: "20", responsavelEmail: "", responsavelNome: "", localizacao: "", observacoes: "" });
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.nome || !form.valorAquisicao) return;
    const payload = { ...form, valorAquisicao: parseFloat(form.valorAquisicao), vidaUtilMeses: parseInt(form.vidaUtilMeses), taxaDepreciacao: parseFloat(form.taxaDepreciacao) };
    if (editando) {
      await fetch("/api/contabil/patrimonio", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editando.id, ...payload }) });
    } else {
      await fetch("/api/contabil/patrimonio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setShowModal(false); fetchAtivos();
  };

  const excluir = async (id: string) => { if (!confirm("Excluir este ativo?")) return; await fetch(`/api/contabil/patrimonio?id=${id}`, { method: "DELETE" }); fetchAtivos(); };

  const filtrados = ativos.filter(a => a.nome.toLowerCase().includes(busca.toLowerCase()) || (a.marca || "").toLowerCase().includes(busca.toLowerCase()));
  const totalAquisicao = filtrados.reduce((s, a) => s + a.valorAquisicao, 0);
  const totalResidual = filtrados.reduce((s, a) => s + a.valorResidual, 0);
  const totalDepreciacao = filtrados.reduce((s, a) => s + a.depreciacaoAcumulada, 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1"><Package className="h-5 w-5" /><span className="text-xs uppercase tracking-widest font-semibold">Controle Patrimonial</span></div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Ativo Imobilizado</h1>
            <p className="text-zinc-500 text-sm mt-1">Controle de equipamentos, móveis e veículos com depreciação contábil automática.</p>
          </div>
          <button onClick={abrirNovo} className="flex items-center gap-2 bg-brand text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 shadow-lg shadow-brand/20">
            <Plus className="h-4 w-4" /> Novo Ativo
          </button>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-brand" />
            <div><p className="text-xs text-zinc-400 font-semibold">Valor de Aquisição</p><p className="text-lg font-bold text-zinc-900 dark:text-white">{fmt(totalAquisicao)}</p></div>
          </div>
          <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl p-4 flex items-center gap-3">
            <TrendingDown className="h-5 w-5 text-rose-600" />
            <div><p className="text-xs text-rose-600 font-semibold">Depreciação Acumulada</p><p className="text-lg font-bold text-rose-700 dark:text-rose-300">{fmt(totalDepreciacao)}</p></div>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center gap-3">
            <Package className="h-5 w-5 text-emerald-600" />
            <div><p className="text-xs text-emerald-600 font-semibold">Valor Residual</p><p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{fmt(totalResidual)}</p></div>
          </div>
        </div>

        {/* Busca */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" placeholder="Buscar ativo..." value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" /></div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
            <Package className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
            <p className="text-zinc-400">Nenhum ativo imobilizado cadastrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtrados.map((a, i) => {
              const cat = CATEGORIAS.find(c => c.value === a.categoria);
              const Icon = cat?.icon || Package;
              const pctDepreciado = a.valorAquisicao > 0 ? (a.depreciacaoAcumulada / a.valorAquisicao) * 100 : 0;
              return (
                <motion.div key={a.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-5 shadow-sm group relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center"><Icon className="h-5 w-5 text-brand" /></div>
                      <div>
                        <h3 className="font-bold text-zinc-900 dark:text-white text-sm">{a.nome}</h3>
                        <p className="text-xs text-zinc-400">{cat?.label} {a.numeroPatrimonio ? `• ${a.numeroPatrimonio}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => excluir(a.id)} className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-400"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {a.marca && <p className="text-xs text-zinc-500 mb-2">{a.marca} {a.modelo}</p>}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-zinc-400">Valor Aquisição</span><span className="font-bold text-zinc-700 dark:text-zinc-300">{fmt(a.valorAquisicao)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Depreciação</span><span className="font-bold text-rose-600">{fmt(a.depreciacaoAcumulada)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-400">Valor Residual</span><span className="font-bold text-emerald-600">{fmt(a.valorResidual)}</span></div>
                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-rose-500 rounded-full transition-all duration-700" style={{ width: `${Math.min(100, pctDepreciado)}%` }} />
                    </div>
                    <p className="text-[10px] text-zinc-400 text-right">{pctDepreciado.toFixed(0)}% depreciado • {a.mesesUso} meses de uso</p>
                  </div>
                  {a.responsavelNome && <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500">👤 {a.responsavelNome} {a.localizacao ? `• 📍 ${a.localizacao}` : ""}</div>}
                  <span className={`absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${a.status === "EM_USO" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : a.status === "BAIXADO" ? "bg-zinc-100 text-zinc-500" : "bg-amber-100 text-amber-700"}`}>{a.status.replace("_", " ")}</span>
                </motion.div>
              );
            })}
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
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{editando ? "Editar Ativo" : "Novo Ativo Imobilizado"}</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4">
                  <input type="text" placeholder="Nome (ex: Notebook Dell)" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                      className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none">
                      {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <input type="text" placeholder="Nº Patrimônio (PAT-001)" value={form.numeroPatrimonio} onChange={e => setForm(f => ({ ...f, numeroPatrimonio: e.target.value }))}
                      className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Marca" value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
                      className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                    <input type="text" placeholder="Modelo" value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
                      className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-zinc-400 mb-1 block">Data Aquisição</label>
                      <input type="date" value={form.dataAquisicao} onChange={e => setForm(f => ({ ...f, dataAquisicao: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" /></div>
                    <div><label className="text-xs text-zinc-400 mb-1 block">Valor (R$)</label>
                      <input type="number" step="0.01" value={form.valorAquisicao} onChange={e => setForm(f => ({ ...f, valorAquisicao: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-zinc-400 mb-1 block">Vida Útil (meses)</label>
                      <input type="number" value={form.vidaUtilMeses} onChange={e => setForm(f => ({ ...f, vidaUtilMeses: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" /></div>
                    <div><label className="text-xs text-zinc-400 mb-1 block">Depreciação (%/ano)</label>
                      <input type="number" value={form.taxaDepreciacao} onChange={e => setForm(f => ({ ...f, taxaDepreciacao: e.target.value }))}
                        className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="Responsável (nome)" value={form.responsavelNome} onChange={e => setForm(f => ({ ...f, responsavelNome: e.target.value }))}
                      className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                    <input type="text" placeholder="Localização" value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))}
                      className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  </div>
                  <button onClick={salvar} className="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-brand/20">
                    {editando ? "Salvar" : "Cadastrar Ativo"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
