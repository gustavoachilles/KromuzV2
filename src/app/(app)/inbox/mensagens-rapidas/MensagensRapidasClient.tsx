"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Plus, Edit3, Trash2, X, Copy, Search } from "lucide-react";
import { toast } from "sonner";

type MsgRapida = { id: string; titulo: string; conteudo: string; atalho?: string; categoria?: string };

const CATEGORIAS = ["VENDAS", "SUPORTE", "FINANCEIRO", "GERAL"];

export function MensagensRapidasClient() {
  const [msgs, setMsgs] = useState<MsgRapida[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editando, setEditando] = useState<MsgRapida | null>(null);
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ titulo: "", conteudo: "", atalho: "", categoria: "GERAL" });

  useEffect(() => {
    setLoading(true);
    fetch("/api/inbox/mensagens-rapidas").then(r => r.json()).then(setMsgs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const salvar = async () => {
    if (!form.titulo || !form.conteudo) return;
    const method = editando ? "PUT" : "POST";
    const body = editando ? { id: editando.id, ...form } : form;
    const r = await fetch("/api/inbox/mensagens-rapidas", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) {
      const saved = await r.json();
      if (editando) setMsgs(prev => prev.map(m => m.id === saved.id ? saved : m));
      else setMsgs(prev => [...prev, saved]);
      setShowModal(false);
      toast.success(editando ? "Editado!" : "Criado!");
    }
  };

  const excluir = async (id: string) => {
    if (!confirm("Excluir?")) return;
    await fetch(`/api/inbox/mensagens-rapidas?id=${id}`, { method: "DELETE" });
    setMsgs(prev => prev.filter(m => m.id !== id));
    toast.success("Excluído!");
  };

  const abrirNovo = () => { setEditando(null); setForm({ titulo: "", conteudo: "", atalho: "", categoria: "GERAL" }); setShowModal(true); };
  const abrirEditar = (m: MsgRapida) => { setEditando(m); setForm({ titulo: m.titulo, conteudo: m.conteudo, atalho: m.atalho || "", categoria: m.categoria || "GERAL" }); setShowModal(true); };

  const filtradas = msgs.filter(m => !busca || m.titulo.toLowerCase().includes(busca.toLowerCase()) || m.conteudo.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1"><Zap className="h-5 w-5" /><span className="text-xs uppercase tracking-widest font-semibold">Comunicação</span></div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Mensagens Rápidas</h1>
            <p className="text-zinc-500 text-sm mt-1">Crie templates de resposta para usar com o atalho "/" no chat. Variáveis: {"{nome}"}, {"{contato}"}</p>
          </div>
          <button onClick={abrirNovo} className="flex items-center gap-2 bg-brand text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 shadow-lg shadow-brand/20">
            <Plus className="h-4 w-4" /> Nova Mensagem
          </button>
        </header>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input type="text" placeholder="Buscar..." value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm outline-none" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtradas.map((m, i) => (
            <motion.div key={m.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-2 group hover:border-brand/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-brand" />
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-white">{m.titulo}</h3>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => abrirEditar(m)} className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400"><Edit3 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => excluir(m.id)} className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-400"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              {m.atalho && <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded-full font-bold">/{m.atalho}</span>}
              <p className="text-xs text-zinc-500 line-clamp-3">{m.conteudo}</p>
              <span className="text-[10px] text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{m.categoria}</span>
            </motion.div>
          ))}
        </div>
        {filtradas.length === 0 && !loading && <p className="text-center text-zinc-400 py-12">Nenhuma mensagem rápida criada.</p>}

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between mb-4">
                  <h2 className="text-lg font-bold">{editando ? "Editar" : "Nova"} Mensagem Rápida</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"><X className="h-5 w-5" /></button>
                </div>
                <div className="space-y-3">
                  <input type="text" placeholder="Título (ex: Saudação)" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  <input type="text" placeholder="Atalho (ex: saudacao)" value={form.atalho} onChange={e => setForm(f => ({ ...f, atalho: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none" />
                  <textarea placeholder="Conteúdo da mensagem... Use {nome} para nome do cliente" value={form.conteudo} onChange={e => setForm(f => ({ ...f, conteudo: e.target.value }))}
                    rows={4} className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none resize-none" />
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm outline-none">
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button onClick={salvar} className="w-full py-3 bg-brand text-white rounded-xl font-bold text-sm hover:opacity-90 shadow-lg shadow-brand/20">
                    {editando ? "Salvar" : "Criar"}
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
