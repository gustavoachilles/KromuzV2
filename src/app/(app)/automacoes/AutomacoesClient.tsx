"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Settings, Workflow, Play, Square, MoreVertical, Search, Edit3 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type AutomacaoFluxo = {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  gatilhoTipo: string | null;
  updatedAt: string;
};

export function AutomacoesClient() {
  const [fluxos, setFluxos] = useState<AutomacaoFluxo[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");

  const fetchFluxos = async () => {
    try {
      const res = await fetch("/api/automacoes");
      if (res.ok) setFluxos(await res.json());
    } catch {
      toast.error("Erro ao buscar fluxos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFluxos();
  }, []);

  const criarFluxo = async () => {
    if (!nome) return toast.error("Nome é obrigatório");
    try {
      const res = await fetch("/api/automacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao }),
      });
      if (res.ok) {
        const fluxo = await res.json();
        toast.success("Fluxo criado!");
        router.push(`/automacoes/${fluxo.id}`);
      } else {
        toast.error("Erro ao criar fluxo");
      }
    } catch {
      toast.error("Erro na comunicação");
    }
  };

  const toggleStatus = async (id: string, ativo: boolean) => {
    try {
      await fetch(`/api/automacoes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo }),
      });
      fetchFluxos();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const excluir = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta automação?")) return;
    try {
      await fetch(`/api/automacoes/${id}`, { method: "DELETE" });
      toast.success("Excluído com sucesso");
      fetchFluxos();
    } catch {
      toast.error("Erro ao excluir");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Workflow className="w-6 h-6 text-brand" />
            Construtor de Automações
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Crie fluxos de trabalho visuais para automatizar processos e mensagens.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-brand text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Fluxo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div></div>
      ) : fluxos.length === 0 ? (
        <div className="text-center bg-white dark:bg-zinc-900 rounded-3xl p-12 border border-zinc-200 dark:border-zinc-800">
          <div className="bg-brand/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-brand">
            <Workflow className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Nenhuma automação</h3>
          <p className="text-zinc-500 text-sm max-w-md mx-auto mb-6">Você ainda não criou nenhum fluxo de trabalho. Clique no botão acima para criar sua primeira automação visual.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fluxos.map((f) => (
            <div key={f.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-5 hover:border-brand/30 transition-colors group flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${f.ativo ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"}`}></div>
                  <span className={`text-xs font-bold ${f.ativo ? "text-emerald-500" : "text-zinc-500"}`}>
                    {f.ativo ? "ATIVO" : "INATIVO"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleStatus(f.id, !f.ativo)} title={f.ativo ? "Pausar" : "Ativar"} className={`p-1.5 rounded-lg ${f.ativo ? "text-amber-500 hover:bg-amber-500/10" : "text-emerald-500 hover:bg-emerald-500/10"}`}>
                    {f.ativo ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                  </button>
                  <button onClick={() => excluir(f.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1 line-clamp-1">{f.nome}</h3>
              <p className="text-xs text-zinc-500 mb-4 line-clamp-2 min-h-[32px]">{f.descricao || "Sem descrição"}</p>
              
              <div className="mt-auto pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <span className="text-[10px] font-medium text-zinc-400">
                  Atualizado em {new Date(f.updatedAt).toLocaleDateString("pt-BR")}
                </span>
                <Link href={`/automacoes/${f.id}`} className="flex items-center gap-1.5 text-sm font-bold text-brand hover:text-brand/80">
                  <Edit3 className="w-4 h-4" /> Editar Fluxo
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 w-full max-w-md border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Novo Fluxo de Automação</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-500 mb-1 block">Nome do fluxo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Qualificação de Lead"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold text-zinc-500 mb-1 block">Descrição (opcional)</label>
                <textarea
                  value={descricao}
                  onChange={e => setDescricao(e.target.value)}
                  placeholder="O que essa automação faz?"
                  rows={3}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 py-2.5 rounded-xl text-sm font-bold">
                Cancelar
              </button>
              <button onClick={criarFluxo} className="flex-1 bg-brand text-white py-2.5 rounded-xl text-sm font-bold">
                Criar e Editar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
