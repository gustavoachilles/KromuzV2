"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import {
  Kanban,
  Plus,
  X,
  Loader2,
  User,
  Phone,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Search,
  Filter,
  GripVertical,
  Building2,
  FileText
} from "lucide-react";
import { toast } from "sonner";

type Proposta = {
  id: string;
  clienteNome: string;
  clienteCpf: string | null;
  clienteTelefone: string | null;
  tipoOperacao: string;
  status: string;
  bancoNome: string | null;
  produtoNome: string | null;
  convenioNome: string | null;
  vendedorNome: string | null;
  valorParcela: number | null;
  valorLiberado: number | null;
  prazo: number | null;
  taxaJuros: number | null;
  observacoes: string | null;
  createdAt: string | Date;
};

type Contagem = {
  status: string;
  _count: number;
  _sum: { valorLiberado: number | null };
};

const statusConfig: Record<string, { label: string; color: string; bgCard: string }> = {
  RASCUNHO: { label: "Rascunho", color: "bg-zinc-400", bgCard: "border-zinc-300 dark:border-zinc-700" },
  SIMULADA: { label: "Simulada", color: "bg-sky-500", bgCard: "border-sky-300 dark:border-sky-800" },
  DIGITADA: { label: "Digitada", color: "bg-amber-500", bgCard: "border-amber-300 dark:border-amber-800" },
  PENDENTE: { label: "Pendente", color: "bg-orange-500", bgCard: "border-orange-300 dark:border-orange-800" },
  APROVADA: { label: "Aprovada", color: "bg-emerald-500", bgCard: "border-emerald-300 dark:border-emerald-800" },
  REPROVADA: { label: "Reprovada", color: "bg-red-500", bgCard: "border-red-300 dark:border-red-800" },
  PAGA: { label: "Paga", color: "bg-violet-500", bgCard: "border-violet-300 dark:border-violet-800" },
  CANCELADA: { label: "Cancelada", color: "bg-zinc-500", bgCard: "border-zinc-400 dark:border-zinc-600" },
};

const tipoLabel: Record<string, string> = {
  EMPRESTIMO_CONSIGNADO: "Margem Nova",
  REFINANCIAMENTO: "Refin",
  PORTABILIDADE: "Port",
  PORTABILIDADE_REFIN: "Port+Refin",
  CARTAO_CONSIGNADO: "Cartão RMC",
  CARTAO_BENEFICIO: "Cartão RCC",
};

const funnelOrder = ["RASCUNHO", "SIMULADA", "DIGITADA", "PENDENTE", "APROVADA", "PAGA"];

export function EsteiraClient({
  propostas: propostasIniciais,
  contagens,
}: {
  propostas: Proposta[];
  contagens: Contagem[];
}) {
  const router = useRouter();
  const [propostas] = useState(propostasIniciais);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [filtroStatus, setFiltroStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [atualizando, setAtualizando] = useState<string | null>(null);
  const [form, setForm] = useState({
    clienteNome: "",
    clienteCpf: "",
    clienteTelefone: "",
    tipoOperacao: "EMPRESTIMO_CONSIGNADO",
    bancoNome: "",
    valorLiberado: "",
    observacoes: "",
  });

  const filtrados = propostas.filter((p) => {
    if (filtroStatus && p.status !== filtroStatus) return false;
    if (busca && !p.clienteNome.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });

  // Funil KPIs
  const funnelData = funnelOrder.map((s) => {
    const c = contagens.find((x) => x.status === s);
    return {
      status: s,
      label: statusConfig[s]?.label || s,
      count: c?._count || 0,
      valor: c?._sum?.valorLiberado || 0,
      color: statusConfig[s]?.color || "bg-zinc-400",
    };
  });
  const maxFunnel = Math.max(...funnelData.map((f) => f.count), 1);

  async function criarProposta(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const res = await fetch("/api/propostas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clienteNome: form.clienteNome,
        clienteCpf: form.clienteCpf || undefined,
        clienteTelefone: form.clienteTelefone || undefined,
        tipoOperacao: form.tipoOperacao,
        bancoNome: form.bancoNome || undefined,
        valorLiberado: form.valorLiberado ? Number(form.valorLiberado) : undefined,
        observacoes: form.observacoes || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok) { setErro(data.error); setSalvando(false); return; }

    setModal(false);
    setSalvando(false);
    setForm({ clienteNome: "", clienteCpf: "", clienteTelefone: "", tipoOperacao: "EMPRESTIMO_CONSIGNADO", bancoNome: "", valorLiberado: "", observacoes: "" });
    router.refresh();
  }

  async function mudarStatus(propostaId: string, novoStatus: string) {
    setAtualizando(propostaId);
    try {
      const res = await fetch(`/api/propostas/${propostaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: novoStatus }),
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      toast.success(`Status atualizado para ${statusConfig[novoStatus]?.label}`);
    } catch (err) {
      toast.error("Não foi possível atualizar o status bancário.");
    } finally {
      setAtualizando(null);
      router.refresh();
    }
  }

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const novoStatus = destination.droppableId;
    await mudarStatus(draggableId, novoStatus);
  };

  function formatMoney(v: number | null) {
    if (!v) return "—";
    return `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
              <Kanban className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Esteira de Propostas</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Propostas</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              {propostas.length} proposta{propostas.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 transition"
          >
            <Plus className="h-4 w-4" /> Nova Proposta
          </button>
        </header>

        {/* Funil */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {funnelData.map((f) => (
            <button
              key={f.status}
              onClick={() => setFiltroStatus(filtroStatus === f.status ? "" : f.status)}
              className={`rounded-xl border p-4 text-left transition hover:shadow-md ${
                filtroStatus === f.status
                  ? "border-violet-400 dark:border-violet-600 bg-violet-50 dark:bg-violet-950/30"
                  : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-2.5 w-2.5 rounded-full ${f.color}`} />
                <span className="text-xs text-zinc-500 font-medium">{f.label}</span>
              </div>
              <p className="text-2xl font-bold tabular-nums">{f.count}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{formatMoney(f.valor)}</p>
              {/* Mini bar */}
              <div className="mt-2 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${f.color} transition-all`}
                  style={{ width: `${(f.count / maxFunnel) * 100}%` }}
                />
              </div>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </div>
          {filtroStatus && (
            <button
              onClick={() => setFiltroStatus("")}
              className="flex items-center gap-1 text-xs text-violet-600 border border-violet-200 rounded-lg px-3 py-2 hover:bg-violet-50 transition"
            >
              <Filter className="h-3 w-3" />
              {statusConfig[filtroStatus]?.label}
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Pipeline Kanban */}
        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[60vh] scrollbar-hide">
          <DragDropContext onDragEnd={onDragEnd}>
            {funnelOrder.map((statusKey) => {
              const cfg = statusConfig[statusKey] || statusConfig.RASCUNHO;
              const items = filtrados.filter(p => p.status === statusKey);
              const totalValor = items.reduce((acc, curr) => acc + (curr.valorLiberado || 0), 0);

              return (
                <div key={statusKey} className="flex-shrink-0 w-80 bg-zinc-100/50 dark:bg-zinc-900/50 rounded-2xl p-3 flex flex-col max-h-[80vh]">
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${cfg.color}`} />
                      <h3 className="font-semibold text-sm">{cfg.label}</h3>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-bold text-zinc-500 bg-white dark:bg-zinc-800 px-2 py-0.5 rounded-full shadow-sm">
                        {items.length}
                      </span>
                      <span className="text-[9px] text-zinc-400 mt-1 font-medium">{formatMoney(totalValor)}</span>
                    </div>
                  </div>

                  <Droppable droppableId={statusKey}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps} 
                        className={`flex-1 overflow-y-auto space-y-3 p-1 transition-colors rounded-xl min-h-[150px] ${snapshot.isDraggingOver ? 'bg-violet-50 dark:bg-violet-900/20' : ''}`}
                      >
                        {items.length === 0 && !snapshot.isDraggingOver && (
                          <div className="py-10 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl opacity-40">
                             <p className="text-[10px] uppercase font-bold tracking-tighter text-zinc-400">Vazio</p>
                          </div>
                        )}

                        {items.map((p, index) => (
                          <Draggable key={p.id} draggableId={p.id} index={index}>
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef} 
                                {...provided.draggableProps} 
                                {...provided.dragHandleProps}
                                className={`bg-white dark:bg-zinc-950 rounded-xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col gap-3 transition-shadow cursor-pointer ${snapshot.isDragging ? 'shadow-xl ring-2 ring-violet-500/50 opacity-90' : 'hover:shadow-md'}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-bold text-sm leading-tight text-zinc-900 dark:text-zinc-100 line-clamp-2">{p.clienteNome}</p>
                                    <p className="text-[10px] text-zinc-400 font-medium mt-0.5">{tipoLabel[p.tipoOperacao] || p.tipoOperacao}</p>
                                  </div>
                                  <GripVertical className="h-4 w-4 text-zinc-300 shrink-0" />
                                </div>

                                <div className="flex flex-col gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                  {p.bancoNome && (
                                    <div className="flex items-center gap-1.5">
                                      <Building2 className="h-3 w-3 shrink-0" />
                                      <span className="truncate font-medium">{p.bancoNome}</span>
                                    </div>
                                  )}
                                  {p.clienteTelefone && (
                                    <div className="flex items-center gap-1.5">
                                      <Phone className="h-3 w-3 shrink-0" />
                                      <span>{p.clienteTelefone}</span>
                                    </div>
                                  )}
                                </div>

                                {['RASCUNHO', 'SIMULADA'].includes(p.status) && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if(!p.bancoNome) return alert("Defina um banco na proposta antes de enviá-la para o robô.");
                                      const btn = e.currentTarget;
                                      const originalText = btn.innerHTML;
                                      btn.innerHTML = "Enviando...";
                                      try {
                                        const res = await fetch('/api/rpa/digitar', {
                                          method: 'POST',
                                          headers: {'Content-Type': 'application/json'},
                                          body: JSON.stringify({ propostaId: p.id, banco: p.bancoNome })
                                        });
                                        if(res.ok) {
                                          alert("Sucesso! Tarefa enfileirada no Robô RPA. O status mudará automaticamente quando a digitação for concluída.");
                                        } else {
                                          throw new Error("API Falhou");
                                        }
                                      } catch(err) {
                                        alert("Erro ao conectar com a fila RPA.");
                                      } finally {
                                        btn.innerHTML = originalText;
                                      }
                                    }}
                                    className="mt-1 w-full flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition"
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m12 16 4-4-4-4"/><path d="M8 12h8"/></svg>
                                    Digitação Automática
                                  </button>
                                )}

                                <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/50 mt-1">
                                  <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatMoney(p.valorLiberado)}
                                  </div>
                                  <div className="flex items-center gap-1 text-[9px] text-zinc-400 uppercase tracking-tighter">
                                    <Clock className="h-3 w-3" />
                                    {new Date(p.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                                  </div>
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
          </DragDropContext>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">Nova Proposta</h2>
              <button onClick={() => setModal(false)} className="text-zinc-400 hover:text-zinc-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={criarProposta} className="p-6 space-y-4">
              {erro && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">{erro}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium">Nome do Cliente *</label>
                  <input required value={form.clienteNome} onChange={(e) => setForm({ ...form, clienteNome: e.target.value })} placeholder="João da Silva"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">CPF</label>
                  <input value={form.clienteCpf} onChange={(e) => setForm({ ...form, clienteCpf: e.target.value })} placeholder="000.000.000-00"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Telefone</label>
                  <input value={form.clienteTelefone} onChange={(e) => setForm({ ...form, clienteTelefone: e.target.value })} placeholder="(11) 99999-0000"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo *</label>
                  <select value={form.tipoOperacao} onChange={(e) => setForm({ ...form, tipoOperacao: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50">
                    {Object.entries(tipoLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-500">Banco</label>
                  <input value={form.bancoNome} onChange={(e) => setForm({ ...form, bancoNome: e.target.value })} placeholder="BMG, Pan..."
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-sm font-medium text-zinc-500">Valor Liberado Estimado</label>
                  <input type="number" step="0.01" value={form.valorLiberado} onChange={(e) => setForm({ ...form, valorLiberado: e.target.value })} placeholder="5000.00"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition">Cancelar</button>
                <button type="submit" disabled={salvando}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 disabled:opacity-50 transition">
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {salvando ? "Criando..." : "Criar Proposta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getNextStatus(current: string): string | null {
  const flow: Record<string, string> = {
    RASCUNHO: "SIMULADA",
    SIMULADA: "DIGITADA",
    DIGITADA: "PENDENTE",
    PENDENTE: "APROVADA",
    APROVADA: "PAGA",
  };
  return flow[current] || null;
}
