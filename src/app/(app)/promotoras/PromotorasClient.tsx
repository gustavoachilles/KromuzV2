"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Loader2, Edit2, Trash2, Building2, Building, CheckCircle2, XCircle, FileText } from "lucide-react";
import { toast } from "sonner";

type Promotora = {
  id: string;
  nome: string;
  cnpj: string | null;
  ativo: boolean;
  createdAt: string;
};

export function PromotorasClient() {
  const [promotoras, setPromotoras] = useState<Promotora[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal de Cadastro/Edição
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ id: "", nome: "", cnpj: "", ativo: true });

  const fetchPromotoras = async () => {
    try {
      const res = await fetch("/api/promotoras");
      if (res.ok) setPromotoras(await res.json());
    } catch (e) {
      toast.error("Erro ao carregar promotoras");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotoras();
  }, []);

  const openNew = () => {
    setForm({ id: "", nome: "", cnpj: "", ativo: true });
    setModalOpen(true);
  };

  const openEdit = (p: Promotora) => {
    setForm({ id: p.id, nome: p.nome, cnpj: p.cnpj || "", ativo: p.ativo });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("O nome é obrigatório");
    
    setSaving(true);
    try {
      const isEdit = !!form.id;
      const method = isEdit ? "PUT" : "POST";
      const payload = { ...form, cnpj: form.cnpj || null };

      const res = await fetch("/api/promotoras", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(isEdit ? "Promotora atualizada!" : "Promotora criada!");
        setModalOpen(false);
        fetchPromotoras();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao salvar promotora");
      }
    } catch (e) {
      toast.error("Erro de comunicação");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir a promotora ${nome}?`)) return;
    
    try {
      const res = await fetch(`/api/promotoras?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Promotora excluída!");
        fetchPromotoras();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao excluir");
      }
    } catch (e) {
      toast.error("Erro de comunicação");
    }
  };

  const filtered = promotoras.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-xl flex items-center justify-center border border-orange-200 dark:border-orange-800">
              <Building2 className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-50">Promotoras</h1>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-xl leading-relaxed">
            Cadastre as Promotoras que você utiliza para digitar contratos. O repasse das comissões é feito através delas para o seu Corban.
          </p>
        </div>

        <button
          onClick={openNew}
          className="bg-orange-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-orange-700 transition shadow-lg shadow-orange-600/30 flex items-center gap-2 group w-full md:w-auto justify-center"
        >
          <Plus className="h-5 w-5 group-hover:scale-110 transition-transform" />
          Nova Promotora
        </button>
      </div>

      {/* BODY / TABLE */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Search Bar */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar promotora..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm text-zinc-800 dark:text-zinc-200"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-zinc-400">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
              <p className="text-sm font-medium">Carregando promotoras...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-zinc-400">
              <Building className="h-12 w-12 text-zinc-300 dark:text-zinc-700" />
              <p className="text-sm font-medium text-zinc-500">Nenhuma promotora encontrada.</p>
              {search && (
                <button onClick={() => setSearch("")} className="text-xs text-orange-600 font-semibold hover:underline">
                  Limpar busca
                </button>
              )}
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl">Nome da Promotora</th>
                  <th className="px-6 py-4">CNPJ</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right rounded-tr-xl">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30 transition group">
                    <td className="px-6 py-4 font-bold text-zinc-800 dark:text-zinc-200">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-400 shrink-0">
                          <Building className="h-4 w-4" />
                        </div>
                        {p.nome}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 font-mono">
                      {p.cnpj || "—"}
                    </td>
                    <td className="px-6 py-4">
                      {p.ativo ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100/50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                          <XCircle className="h-3.5 w-3.5" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.nome)}
                          className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-zinc-200 dark:border-zinc-800">
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
              <h3 className="font-bold text-lg text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                <FileText className="h-5 w-5 text-orange-500" />
                {form.id ? "Editar Promotora" : "Nova Promotora"}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300 transition p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <Plus className="h-5 w-5 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">Nome da Promotora *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Promotora Gold, Realiza..."
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">CNPJ</label>
                <input
                  type="text"
                  placeholder="00.000.000/0000-00"
                  value={form.cnpj}
                  onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition text-sm"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="relative flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={form.ativo}
                    onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-500"></div>
                </label>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Promotora Ativa (aparece nos formulários)</span>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold rounded-xl hover:bg-zinc-800 dark:hover:bg-white transition flex items-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
