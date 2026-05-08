"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Users, Plus, X, Loader2, Phone, Mail, MapPin, Clock, DollarSign, GripVertical
} from "lucide-react";

type PipelineColuna = { id: string; nome: string; cor: string | null; ordem: number; };

type Lead = {
  id: string; nome: string; cpf: string | null; telefone: string | null;
  email: string | null; uf: string | null; status: string; origem: string | null;
  tipoOperacao: string | null; valorEstimado: number | null;
  vendedorNome: string | null; createdAt: string | Date;
};

type Contagem = { status: string; _count: number };

const tipoLabel: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "Margem Nova", REFINANCIAMENTO: "Refin",
  PORTABILIDADE: "Port", PORTABILIDADE_REFIN: "Port+Refin",
  CARTAO_CONSIGNADO: "RMC", CARTAO_BENEFICIO: "RCC",
};

export function LeadsClient({
  leads: leadsIniciais,
  contagens,
  colunas
}: {
  leads: Lead[];
  contagens: Contagem[];
  colunas: PipelineColuna[];
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(leadsIniciais);
  const [modal, setModal] = useState(false);
  const [modalColuna, setModalColuna] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "", cpf: "", telefone: "", email: "", uf: "",
    tipoOperacao: "", valorEstimado: "", bancoPreferido: "",
    origem: "manual", observacoes: "",
  });
  
  const [novaColunaNome, setNovaColunaNome] = useState("");

  const totalAtivos = leads.length;

  async function criarLead(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const payload: any = { ...form };
    Object.keys(payload).forEach(key => {
      if (payload[key] === "") payload[key] = undefined;
    });

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        valorEstimado: payload.valorEstimado ? Number(payload.valorEstimado) : undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setErro(data.error); setSalvando(false); return;
    }

    setModal(false);
    setSalvando(false);
    setForm({ nome: "", cpf: "", telefone: "", email: "", uf: "", tipoOperacao: "", valorEstimado: "", bancoPreferido: "", origem: "manual", observacoes: "" });
    router.refresh();
    setTimeout(() => window.location.reload(), 500); // hard refresh to get new items
  }

  async function criarColuna(e: React.FormEvent) {
    e.preventDefault();
    if (!novaColunaNome) return;
    setSalvando(true);
    
    await fetch("/api/leads/pipeline-colunas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: novaColunaNome, cor: "bg-zinc-500" }),
    });
    
    setModalColuna(false);
    setSalvando(false);
    setNovaColunaNome("");
    router.refresh();
  }

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Local optimistic update
    const newStatus = destination.droppableId;
    setLeads(prev => prev.map(l => l.id === draggableId ? { ...l, status: newStatus } : l));

    // Persist
    await fetch(`/api/leads/${draggableId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    // Auto-calcula a comissão se moveu para PAGO
    if (newStatus === "PAGO" || newStatus === "Pago") {
      try {
        await fetch(`/api/leads/${draggableId}/comissao`, { method: "POST" });
        // Opcional: mostrar um toast avisando que foi enviado para o Financeiro
      } catch (e) {}
    }

    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
              <Users className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">CRM Kanban</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Pipeline de Leads</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              {totalAtivos} lead{totalAtivos !== 1 ? "s" : ""} no funil
            </p>
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 transition">
            <Plus className="h-4 w-4" /> Novo Lead
          </button>
        </header>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[60vh]">
          <DragDropContext onDragEnd={onDragEnd}>
            {colunas.map((coluna) => {
              const items = leads.filter(l => l.status === coluna.nome);
              return (
                <div key={coluna.id} className="flex-shrink-0 w-80 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl p-3 flex flex-col max-h-[80vh]">
                  <div className="flex items-center justify-between px-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${coluna.cor || 'bg-zinc-400'}`} />
                      <h3 className="font-semibold text-sm">{coluna.nome}</h3>
                    </div>
                    <span className="text-xs font-bold text-zinc-500 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full shadow-sm">
                      {items.length}
                    </span>
                  </div>

                  <Droppable droppableId={coluna.nome}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 overflow-y-auto space-y-3 p-1 transition-colors rounded-xl ${snapshot.isDraggingOver ? 'bg-violet-50 dark:bg-violet-900/20' : ''}`}
                      >
                        {items.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3 transition-shadow ${snapshot.isDragging ? 'shadow-xl ring-2 ring-violet-500/50 opacity-90' : 'hover:shadow-md'}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <p className="font-bold text-sm leading-tight text-zinc-900 dark:text-zinc-100 line-clamp-2">
                                    {lead.nome}
                                  </p>
                                  <GripVertical className="h-4 w-4 text-zinc-300 shrink-0 cursor-grab active:cursor-grabbing" />
                                </div>
                                
                                <div className="flex flex-col gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                  {lead.telefone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{lead.telefone}</span>}
                                  {lead.email && <span className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{lead.email}</span></span>}
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-1">
                                  <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    {lead.valorEstimado ? (
                                      <>
                                        <DollarSign className="h-3.5 w-3.5" />
                                        {lead.valorEstimado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                      </>
                                    ) : (
                                      <span className="text-zinc-400 font-normal">Sem valor</span>
                                    )}
                                  </div>
                                  
                                  {lead.tipoOperacao && (
                                    <span className="text-[10px] bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded text-zinc-600 dark:text-zinc-300 font-medium truncate max-w-[100px]">
                                      {tipoLabel[lead.tipoOperacao] || lead.tipoOperacao}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
            
            {/* Botão de Nova Coluna */}
            <div className="flex-shrink-0 w-80 bg-transparent border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center opacity-70 hover:opacity-100 hover:border-violet-300 transition-all cursor-pointer h-32"
                 onClick={() => setModalColuna(true)}>
              <Plus className="h-6 w-6 text-zinc-400 mb-2" />
              <p className="text-sm font-medium text-zinc-500">Adicionar Coluna</p>
            </div>
            
          </DragDropContext>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
              <h2 className="text-lg font-semibold">Novo Lead</h2>
              <button onClick={() => setModal(false)} className="text-zinc-400 hover:text-zinc-600 transition"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={criarLead} className="p-6 space-y-4">
              {erro && <div className="rounded-lg bg-red-50 text-red-700 px-4 py-3 text-sm">{erro}</div>}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome *</label>
                <input required value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Telefone</label>
                  <input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-zinc-600">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {salvando ? "Criando..." : "Criar Lead"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal Nova Coluna */}
      {modalColuna && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">Nova Coluna</h2>
              <button onClick={() => setModalColuna(false)} className="text-zinc-400 hover:text-zinc-600 transition"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={criarColuna} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Coluna *</label>
                <input required value={novaColunaNome} onChange={e => setNovaColunaNome(e.target.value)} placeholder="Ex: CONTRATO ASSINADO"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 uppercase" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModalColuna(false)} className="px-4 py-2 text-sm text-zinc-600">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {salvando ? "Criando..." : "Criar Coluna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
