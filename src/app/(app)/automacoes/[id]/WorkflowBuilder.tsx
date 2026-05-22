"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  Handle,
  Position,
  Panel,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Save, Zap, MessageSquare, Split, Clock, Settings, X, Tag } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

// --- Custom Nodes ---
const TriggerNode = ({ data }: any) => (
  <div className="bg-white dark:bg-zinc-900 border-2 border-brand rounded-xl p-3 w-[200px] shadow-lg">
    <div className="flex items-center gap-2 mb-2">
      <div className="bg-brand/20 p-1.5 rounded-lg text-brand"><Zap className="w-4 h-4" /></div>
      <span className="font-bold text-xs">Gatilho</span>
    </div>
    <div className="text-xs text-zinc-500">{data.label || "Nova Mensagem"}</div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-brand" />
  </div>
);

const MessageNode = ({ data }: any) => (
  <div className="bg-white dark:bg-zinc-900 border-2 border-blue-500 rounded-xl p-3 w-[200px] shadow-lg">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-blue-500" />
    <div className="flex items-center gap-2 mb-2">
      <div className="bg-blue-500/20 p-1.5 rounded-lg text-blue-500"><MessageSquare className="w-4 h-4" /></div>
      <span className="font-bold text-xs">Enviar Mensagem</span>
    </div>
    <div className="text-xs text-zinc-500 truncate">{data.label || "Mensagem de texto..."}</div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-blue-500" />
  </div>
);

const ConditionNode = ({ data }: any) => (
  <div className="bg-white dark:bg-zinc-900 border-2 border-amber-500 rounded-xl p-3 w-[200px] shadow-lg">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-amber-500" />
    <div className="flex items-center gap-2 mb-2">
      <div className="bg-amber-500/20 p-1.5 rounded-lg text-amber-500"><Split className="w-4 h-4" /></div>
      <span className="font-bold text-xs">Condição</span>
    </div>
    <div className="text-xs text-zinc-500">{data.label || "Se x = y"}</div>
    
    <Handle type="source" position={Position.Bottom} id="true" className="w-3 h-3 bg-emerald-500 -ml-8" />
    <div className="absolute -bottom-5 left-8 text-[9px] font-bold text-emerald-500">Sim</div>
    
    <Handle type="source" position={Position.Bottom} id="false" className="w-3 h-3 bg-rose-500 ml-8" />
    <div className="absolute -bottom-5 right-8 text-[9px] font-bold text-rose-500">Não</div>
  </div>
);

const DelayNode = ({ data }: any) => (
  <div className="bg-white dark:bg-zinc-900 border-2 border-zinc-400 rounded-xl p-3 w-[200px] shadow-lg">
    <Handle type="target" position={Position.Top} className="w-3 h-3 bg-zinc-400" />
    <div className="flex items-center gap-2 mb-2">
      <div className="bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-lg text-zinc-500"><Clock className="w-4 h-4" /></div>
      <span className="font-bold text-xs">Aguardar</span>
    </div>
    <div className="text-xs text-zinc-500">{data.label || "1 minuto"}</div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-zinc-400" />
  </div>
);

const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  condition: ConditionNode,
  delay: DelayNode,
};

// --- Main Component ---
function FlowBuilderContent({ id }: { id: string }) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fluxo, setFluxo] = useState<any>(null);

  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Fetch Data
  useEffect(() => {
    const fetchFluxo = async () => {
      try {
        const res = await fetch(`/api/automacoes/${id}`);
        if (res.ok) {
          const data = await res.json();
          setFluxo(data);
          if (data.nodes && data.nodes !== "[]") setNodes(JSON.parse(data.nodes));
          if (data.edges && data.edges !== "[]") setEdges(JSON.parse(data.edges));
        }
      } catch (e) {
        toast.error("Erro ao carregar fluxo");
      } finally {
        setLoading(false);
      }
    };
    fetchFluxo();
  }, [id]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({ ...params, type: 'smoothstep', animated: true }, eds));
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: { label: `Novo ${type}` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance]
  );

  const onNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  const onPaneClick = () => {
    setSelectedNode(null);
  };

  const updateNodeData = (label: string, config: any = {}) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === selectedNode.id) {
          return { ...n, data: { ...n.data, label, ...config } };
        }
        return n;
      })
    );
    setSelectedNode((prev: any) => ({ ...prev, data: { ...prev.data, label, ...config } }));
  };

  const salvar = async () => {
    try {
      const res = await fetch(`/api/automacoes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
        }),
      });
      if (res.ok) {
        toast.success("Fluxo salvo com sucesso!");
      } else {
        toast.error("Erro ao salvar fluxo");
      }
    } catch {
      toast.error("Erro na comunicação");
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div></div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/automacoes" className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-zinc-900 dark:text-white">{fluxo?.nome || "Fluxo"}</h1>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">{fluxo?.ativo ? "Ativo" : "Inativo"}</p>
          </div>
        </div>
        <button onClick={salvar} className="bg-brand text-white px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-brand/90 transition-colors shadow-lg shadow-brand/20">
          <Save className="w-4 h-4" /> Salvar Fluxo
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Paleta */}
        <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 overflow-y-auto z-10">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Blocos (Arraste)</h3>
          
          <div className="space-y-3">
            <div className="border border-brand/30 bg-brand/5 p-3 rounded-xl cursor-grab active:cursor-grabbing hover:border-brand transition-colors"
                 onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'trigger'); }} draggable>
              <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-brand" /><span className="text-sm font-bold text-zinc-900 dark:text-white">Gatilho</span></div>
              <p className="text-[10px] text-zinc-500 mt-1">Inicia a automação</p>
            </div>

            <div className="border border-blue-500/30 bg-blue-500/5 p-3 rounded-xl cursor-grab active:cursor-grabbing hover:border-blue-500 transition-colors"
                 onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'message'); }} draggable>
              <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-blue-500" /><span className="text-sm font-bold text-zinc-900 dark:text-white">Mensagem</span></div>
              <p className="text-[10px] text-zinc-500 mt-1">Envia texto/mídia</p>
            </div>

            <div className="border border-amber-500/30 bg-amber-500/5 p-3 rounded-xl cursor-grab active:cursor-grabbing hover:border-amber-500 transition-colors"
                 onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'condition'); }} draggable>
              <div className="flex items-center gap-2"><Split className="w-4 h-4 text-amber-500" /><span className="text-sm font-bold text-zinc-900 dark:text-white">Condição</span></div>
              <p className="text-[10px] text-zinc-500 mt-1">Bifurca o fluxo (Sim/Não)</p>
            </div>

            <div className="border border-zinc-400/30 bg-zinc-400/5 p-3 rounded-xl cursor-grab active:cursor-grabbing hover:border-zinc-400 transition-colors"
                 onDragStart={(e) => { e.dataTransfer.setData('application/reactflow', 'delay'); }} draggable>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-zinc-500" /><span className="text-sm font-bold text-zinc-900 dark:text-white">Atraso (Delay)</span></div>
              <p className="text-[10px] text-zinc-500 mt-1">Aguarda X tempo</p>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            className="bg-zinc-50 dark:bg-zinc-950"
          >
            <Background color="#7c3aed" gap={20} size={1} className="opacity-20" />
            <Controls className="fill-zinc-400 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden shadow-lg" />
          </ReactFlow>

          {/* Properties Panel (Absolute inside canvas) */}
          {selectedNode && (
            <div className="absolute top-4 right-4 w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 overflow-hidden flex flex-col max-h-[calc(100%-32px)]">
              <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950">
                <span className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-1"><Settings className="w-3.5 h-3.5" /> Propriedades</span>
                <button onClick={() => setSelectedNode(null)} className="p-1 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800"><X className="w-4 h-4 text-zinc-500" /></button>
              </div>
              <div className="p-4 overflow-y-auto space-y-4">
                
                {selectedNode.type === 'trigger' && (
                  <div>
                    <label className="text-xs font-bold block mb-1.5 text-zinc-600 dark:text-zinc-400">Tipo de Gatilho</label>
                    <select 
                      value={selectedNode.data.label as string} 
                      onChange={(e) => updateNodeData(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm outline-none"
                    >
                      <option value="Nova Mensagem (WhatsApp)">Nova Mensagem (WhatsApp)</option>
                      <option value="Novo Lead Criado">Novo Lead Criado</option>
                      <option value="Tag Adicionada">Tag Adicionada</option>
                    </select>
                  </div>
                )}

                {selectedNode.type === 'message' && (
                  <div>
                    <label className="text-xs font-bold block mb-1.5 text-zinc-600 dark:text-zinc-400">Texto da Mensagem</label>
                    <textarea 
                      value={selectedNode.data.label as string} 
                      onChange={(e) => updateNodeData(e.target.value)}
                      rows={5}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm outline-none resize-none"
                      placeholder="Olá, como posso ajudar?"
                    />
                    <p className="text-[10px] text-zinc-400 mt-1">Use {'{nome}'} para citar o lead.</p>
                  </div>
                )}

                {selectedNode.type === 'condition' && (
                  <div>
                    <label className="text-xs font-bold block mb-1.5 text-zinc-600 dark:text-zinc-400">Condição</label>
                    <input 
                      type="text"
                      value={selectedNode.data.label as string} 
                      onChange={(e) => updateNodeData(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm outline-none"
                      placeholder="Ex: Mensagem contém 'comprar'"
                    />
                  </div>
                )}

                {selectedNode.type === 'delay' && (
                  <div>
                    <label className="text-xs font-bold block mb-1.5 text-zinc-600 dark:text-zinc-400">Tempo de Espera</label>
                    <input 
                      type="text"
                      value={selectedNode.data.label as string} 
                      onChange={(e) => updateNodeData(e.target.value)}
                      className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-sm outline-none"
                      placeholder="Ex: 5 minutos"
                    />
                  </div>
                )}

                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button 
                    onClick={() => {
                      setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                      setSelectedNode(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-red-500 hover:bg-red-500/10 text-xs font-bold transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Deletar Nó
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export function WorkflowBuilder({ id }: { id: string }) {
  return (
    <ReactFlowProvider>
      <FlowBuilderContent id={id} />
    </ReactFlowProvider>
  );
}
