"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, Plus, X, Trash2, Edit3, Search } from "lucide-react";

type Categoria = {
  id: string; nome: string; tipo: string; grupo: string | null;
  icone?: string; cor?: string; ordem: number; ativo: boolean;
};

const TIPOS = [
  { value: "RECEITA", label: "Receita", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  { value: "DESPESA", label: "Despesa", color: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300" },
  { value: "IMPOSTO", label: "Imposto", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  { value: "TRANSFERENCIA", label: "Transferência", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
];

const CORES = ["#10b981", "#f43f5e", "#f59e0b", "#6366f1", "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#ef4444", "#a855f7", "#06b6d4", "#84cc16"];

export function CategoriasClient() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ nome: "", tipo: "DESPESA", grupo: "", icone: "", cor: CORES[0] });

  const fetchCategorias = async () => {
    setLoading(true);
    try { const r = await fetch("/api/contabil/categorias"); if (r.ok) setCategorias(await r.json()); } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchCategorias(); }, []);

  const abrirNovo = () => {
    setEditando(null);
    setForm({ nome: "", tipo: "DESPESA", grupo: "", icone: "", cor: CORES[categorias.length % CORES.length] });
    setShowModal(true);
  };

  const abrirEditar = (c: Categoria) => {
    setEditando(c);
    setForm({ nome: c.nome, tipo: c.tipo, grupo: c.grupo || "", icone: c.icone || "", cor: c.cor || CORES[0] });
    setShowModal(true);
  };

  const salvar = async () => {
    if (!form.nome) return;
    if (editando) {
      await fetch("/api/contabil/categorias", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editando.id, ...form }) });
    } else {
      await fetch("/api/contabil/categorias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    }
    setShowModal(false); fetchCategorias();
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir esta categoria?")) return;
    const res = await fetch(`/api/contabil/categorias?id=${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); alert(d.error); return; }
    fetchCategorias();
  };

  const filtradas = categorias.filter(c => {
    if (filtroTipo && c.tipo !== filtroTipo) return false;
    if (busca && !c.nome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  // Agrupar por tipo
  const grupos: Record<string, Categoria[]> = {};
  filtradas.forEach(c => {
    const key = c.tipo;
    if (!grupos[key]) grupos[key] = [];
    grupos[key].push(c);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1"><FolderOpen className="h-5 w-5" /><span className="text-xs uppercase tracking-widest font-semibold">Configuração</span></div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Plano de Contas</h1>
            <p className="text-zinc-500 text-sm mt-1">Categorias de receitas, despesas e impostos usadas nos lançamentos e orçamentos.</p>
          </div>
          <button onClick={abrirNovo} className="flex items-center gap-2 bg-brand text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 shadow-lg shadow-brand/20">
            <Plus className="h-4 w-4" /> Nova Categoria
          </button>
        </header>

        {/* Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input type="text" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none" />
          </div>
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
            <button onClick={() => setFiltroTipo("")} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!filtroTipo ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500"}`}>Todos ({categorias.length})</button>
            {TIPOS.map(t => {
              const count = categorias.filter(c => c.tipo === t.value).length;
              return <button key={t.value} onClick={() => setFiltroTipo(t.value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filtroTipo === t.value ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500"}`}>{t.label} ({count})</button>;
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-brand/30 border-t-brand rounded-full animate-spin" /></div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grupos).map(([tipo, cats]) => {
              const tipoInfo = TIPOS.find(t => t.value === tipo);
              return (
                <div key={tipo}>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${tipoInfo?.color}`}>{tipoInfo?.label}</span>
                    <span className="text-zinc-300 dark:text-zinc-700">— {cats.length} categorias</span>
                  </h3>
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm divide-y divide-zinc-50 dark:divide-zinc-800/50">
                    {cats.map((c, i) => (
                      <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/20 transition-colors group">
                        <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: c.cor || "#6366f1" }} />
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-zinc-900 dark:text-white text-sm">{c.nome}</span>
                          {c.grupo && <span className="text-xs text-zinc-400 ml-2">({c.grupo})</span>}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => abrirEditar(c)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"><Edit3 className="h-3.5 w-3.5" /></button>
                          <button onClick={() => excluir(c.id)} className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
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
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-white">{editando ? "Editar Categoria" : "Nova Categoria"}</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {TIPOS.slice(0, 3).map(t => (
                      <button key={t.value} onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                        className={`py-2 rounded-xl text-sm font-bold transition-all ${form.tipo === t.value ? t.color : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <input type="text" placeholder="Nome da categoria (ex: Aluguel)" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  <input type="text" placeholder="Grupo (ex: Fixas, Variáveis, Folha)" value={form.grupo} onChange={e => setForm(f => ({ ...f, grupo: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Cor</label>
                    <div className="flex gap-2 flex-wrap">
                      {CORES.map(cor => (
                        <button key={cor} onClick={() => setForm(f => ({ ...f, cor }))}
                          className={`w-7 h-7 rounded-full border-2 transition-all ${form.cor === cor ? "border-white ring-2 ring-brand scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: cor }} />
                      ))}
                    </div>
                  </div>
                  <button onClick={salvar} className="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-brand/20">
                    {editando ? "Salvar" : "Criar Categoria"}
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
