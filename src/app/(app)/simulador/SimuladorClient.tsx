"use client";

import { useState } from "react";
import { UploadHiscon } from "@/components/simulador/UploadHiscon";
import { Oportunidade, ClienteSimulacao, ContratoAtivo } from "@/lib/motor-regras/simulador";
import { SimuladorTable } from "@/components/simulador/SimuladorTable";
import { Calculator, FileText, RefreshCw, Wallet, CreditCard, ArrowRightLeft, UserCircle2, ArrowLeft, Search, CheckCircle2, Sparkles, UserCheck, UserPlus, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AiInsightModal } from "@/components/simulador/AiInsightModal";
import { LeadFormModal } from "@/components/LeadFormModal";

interface SimulacaoResult {
  cliente: ClienteSimulacao & { nome?: string };
  contratos: ContratoAtivo[];
  oportunidades: Oportunidade[];
}

interface ClienteVinculado {
  id: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  numeroBeneficio?: string;
  especieBeneficio?: number;
}

export function SimuladorClient({ empresaId, convenios }: { empresaId: string, convenios?: { id: string, nome: string }[] }) {
  const [tab, setTab] = useState<"hiscon" | "manual">("hiscon");
  const [resultado, setResultado] = useState<SimulacaoResult | null>(null);

  // Cliente vinculado
  const [clienteVinculado, setClienteVinculado] = useState<ClienteVinculado | null>(null);
  const [clientesCandidatos, setClientesCandidatos] = useState<ClienteVinculado[]>([]);
  const [showClienteConfirm, setShowClienteConfirm] = useState(false);
  const [showCadastroModal, setShowCadastroModal] = useState(false);
  const [margensAtualizadas, setMargensAtualizadas] = useState(false);

  // Estados da Calculadora Manual
  const [formManual, setFormManual] = useState({
    convenioId: "",
    tipoOperacao: "EMPRESTIMO_CONSIGNADO",
    idade: "",
    margem: ""
  });
  const [isCalculando, setIsCalculando] = useState(false);
  const [insightModal, setInsightModal] = useState<{ open: boolean, context: any }>({ 
    open: false, 
    context: {} 
  });

  // Buscar cliente automaticamente pelos dados do HISCON
  async function buscarClienteAutomatico(clienteData: SimulacaoResult["cliente"]) {
    try {
      const queries: string[] = [];
      if (clienteData.numeroBeneficio) queries.push(clienteData.numeroBeneficio);
      if (clienteData.nome && clienteData.nome.length > 3) queries.push(clienteData.nome);

      let todosResultados: ClienteVinculado[] = [];
      
      for (const q of queries) {
        const res = await fetch(`/api/leads/buscar?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const leads = await res.json();
          for (const lead of leads) {
            if (!todosResultados.find(r => r.id === lead.id)) {
              todosResultados.push(lead);
            }
          }
        }
      }

      if (todosResultados.length === 1) {
        // Encontrou exatamente 1 — pedir confirmação
        setClientesCandidatos(todosResultados);
        setShowClienteConfirm(true);
      } else if (todosResultados.length > 1) {
        // Vários candidatos — pedir para escolher
        setClientesCandidatos(todosResultados);
        setShowClienteConfirm(true);
      } else {
        // Nenhum encontrado — oferecer cadastro
        setClientesCandidatos([]);
        setShowClienteConfirm(true);
      }
    } catch (err) {
      console.error("Erro ao buscar cliente:", err);
    }
  }

  // Confirmar cliente selecionado e atualizar margens
  async function confirmarCliente(cliente: ClienteVinculado) {
    setClienteVinculado(cliente);
    setShowClienteConfirm(false);

    // Atualizar margens do cliente com dados do HISCON
    if (resultado) {
      try {
        const res = await fetch(`/api/leads/${cliente.id}/margens`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            margemLivre: resultado.cliente.margemLivre || undefined,
            margemRmc: resultado.cliente.margemRmc || undefined,
            margemRcc: resultado.cliente.margemRcc || undefined,
            numeroBeneficio: resultado.cliente.numeroBeneficio || undefined,
            especieBeneficio: resultado.cliente.especie || undefined,
          })
        });
        if (res.ok) {
          setMargensAtualizadas(true);
          toast.success("Margens do cliente atualizadas com dados do HISCON");
        }
      } catch {
        toast.error("Erro ao atualizar margens");
      }
    }
  }

  // Quando o HISCON processa com sucesso
  function handleProcessamentoCompleto(data: SimulacaoResult) {
    setResultado(data);
    setClienteVinculado(null);
    setMargensAtualizadas(false);
    // Buscar automaticamente o cliente
    buscarClienteAutomatico(data.cliente);
  }

  // Callback quando cadastra novo cliente
  function handleNovoCadastro() {
    setShowCadastroModal(true);
    setShowClienteConfirm(false);
  }

  function handleCadastroSuccess() {
    setShowCadastroModal(false);
    // Re-buscar cliente após cadastro
    if (resultado) {
      setTimeout(() => buscarClienteAutomatico(resultado.cliente), 500);
    }
  }

  async function handleSimularManual(e: React.FormEvent) {
    e.preventDefault();
    if (!formManual.convenioId || !formManual.margem) {
      toast.error("Preencha o convênio e a margem disponível");
      return;
    }

    setIsCalculando(true);
    try {
      const res = await fetch("/api/simulador/calcular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          convenioId: formManual.convenioId,
          tipoOperacao: formManual.tipoOperacao,
          idade: formManual.idade ? Number(formManual.idade) : undefined,
          margem: Number(formManual.margem.replace(',', '.'))
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResultado(data);
    } catch (err: any) {
      toast.error(err.message || "Erro na simulação");
    } finally {
      setIsCalculando(false);
    }
  }

  if (!resultado) {
    return (
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl w-fit mx-8 mt-8">
          <button
            onClick={() => setTab("hiscon")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition flex items-center gap-2 ${
              tab === "hiscon" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <FileText className="w-4 h-4" /> Análise HISCON (PDF)
          </button>
          <button
            onClick={() => setTab("manual")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition flex items-center gap-2 ${
              tab === "manual" ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Calculator className="w-4 h-4" /> Calculadora Manual
          </button>
        </div>

        {tab === "hiscon" && (
          <div className="p-8">
            <UploadHiscon 
              empresaId={empresaId} 
              onProcessamentoCompleto={handleProcessamentoCompleto} 
            />
          </div>
        )}

        {tab === "manual" && (
          <div className="p-8 max-w-3xl">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-brand" />
                Calculadora Rápida
              </h2>
              
              <form onSubmit={handleSimularManual} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Convênio *</label>
                    <select 
                      value={formManual.convenioId}
                      onChange={e => setFormManual({...formManual, convenioId: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 focus:ring-2 focus:ring-brand/50"
                    >
                      <option value="">Selecione...</option>
                      {convenios?.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Operação</label>
                    <select 
                      value={formManual.tipoOperacao}
                      onChange={e => setFormManual({...formManual, tipoOperacao: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 focus:ring-2 focus:ring-brand/50"
                    >
                      <option value="EMPRESTIMO_CONSIGNADO">Margem Nova / Empréstimo</option>
                      <option value="REFINANCIAMENTO">Refinanciamento</option>
                      <option value="CARTAO_CONSIGNADO">Cartão Consignado (RMC)</option>
                      <option value="CARTAO_BENEFICIO">Cartão Benefício (RCC)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Idade Cliente (Opcional)</label>
                    <input 
                      type="number" 
                      placeholder="Ex: 65"
                      value={formManual.idade}
                      onChange={e => setFormManual({...formManual, idade: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 focus:ring-2 focus:ring-brand/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Margem Disponível (R$) *</label>
                    <input 
                      type="number" step="0.01"
                      placeholder="0.00"
                      value={formManual.margem}
                      onChange={e => setFormManual({...formManual, margem: e.target.value})}
                      className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 focus:ring-2 focus:ring-brand/50 font-bold text-emerald-600"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isCalculando}
                  className="w-full bg-brand text-white font-medium py-3 rounded-lg hover:opacity-90 transition flex justify-center items-center gap-2"
                >
                  {isCalculando ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                  Procurar Oportunidades
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  const { cliente, oportunidades, contratos } = resultado;

  const novoEmprestimo = oportunidades.filter(o => o.tipo === "EMPRESTIMO_CONSIGNADO");
  const portabilidades = oportunidades.filter(o => o.tipo === "PORTABILIDADE");

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Botão de Voltar */}
      <button 
        onClick={() => { setResultado(null); setClienteVinculado(null); setMargensAtualizadas(false); }}
        className="flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Simular outro extrato
      </button>

      {/* Banner de Cliente Vinculado */}
      {clienteVinculado ? (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
                Cliente vinculado: {clienteVinculado.nome}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {clienteVinculado.cpf && `CPF: ${clienteVinculado.cpf} · `}
                {clienteVinculado.numeroBeneficio && `NB: ${clienteVinculado.numeroBeneficio} · `}
                {margensAtualizadas && (
                  <span className="font-semibold">✓ Margens atualizadas em {new Date().toLocaleDateString("pt-BR")}</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => setClienteVinculado(null)}
            className="p-2 text-emerald-400 hover:text-emerald-600 transition"
            title="Desvincular"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Nenhum cliente vinculado a esta simulação
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Propostas geradas ficarão sem vínculo com a carteira de clientes
              </p>
            </div>
          </div>
          <button
            onClick={() => buscarClienteAutomatico(cliente)}
            className="px-3 py-1.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-semibold rounded-lg hover:bg-amber-200 transition"
          >
            Buscar Cliente
          </button>
        </div>
      )}

      {/* Modal de Confirmação de Cliente */}
      {showClienteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <UserCircle2 className="w-5 h-5" />
                <h3 className="font-bold text-lg">
                  {clientesCandidatos.length > 0 ? "Cliente Localizado" : "Cliente Não Encontrado"}
                </h3>
              </div>
              <button onClick={() => setShowClienteConfirm(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {clientesCandidatos.length > 0 ? (
                <>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {clientesCandidatos.length === 1 
                      ? "Encontramos um cliente que corresponde aos dados do HISCON. É este o cliente correto?"
                      : "Encontramos vários clientes que podem corresponder. Selecione o correto:"}
                  </p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {clientesCandidatos.map(c => (
                      <button
                        key={c.id}
                        onClick={() => confirmarCliente(c)}
                        className="w-full text-left p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {c.nome?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{c.nome}</p>
                            <p className="text-xs text-zinc-400 truncate">
                              {c.cpf && `CPF: ${c.cpf}`}
                              {c.numeroBeneficio && ` · NB: ${c.numeroBeneficio}`}
                              {c.telefone && ` · ${c.telefone}`}
                            </p>
                          </div>
                          <CheckCircle2 className="w-5 h-5 text-zinc-300 group-hover:text-blue-500 transition shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <UserPlus className="w-12 h-12 mx-auto text-zinc-300 mb-3" />
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Não encontramos nenhum cliente com os dados extraídos do HISCON.
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {cliente.numeroBeneficio && `NB buscado: ${cliente.numeroBeneficio}`}
                    {cliente.nome && ` · Nome: ${cliente.nome}`}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 flex gap-3 justify-between">
              <button
                onClick={handleNovoCadastro}
                className="px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 transition flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Cadastrar Novo
              </button>
              <button
                onClick={() => setShowClienteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white dark:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 rounded-lg hover:bg-zinc-100 transition"
              >
                Pular
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resumo do Cliente */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center space-x-4 mb-6">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
            <UserCircle2 className="w-6 h-6 text-indigo-300" />
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {clienteVinculado?.nome || cliente.nome || "Resumo do Cliente"}
            </h2>
            <p className="text-slate-300 text-sm">Dados extraídos com precisão via IA</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Benefício</p>
            <p className="text-xl font-semibold">{cliente.numeroBeneficio || "---"}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Espécie</p>
            <p className="text-xl font-semibold">
              {cliente.especie} - {cliente.especieNome || "Pensão"}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Margem Livre</p>
            <p className="text-xl font-semibold text-emerald-400">
              R$ {cliente.margemLivre.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Dívidas Ativas</p>
            <p className="text-xl font-semibold">{contratos.length} contratos</p>
          </div>
        </div>
      </div>

      {/* Stack de Oportunidades (Vertical) */}
      <div className="space-y-8">
        
        {/* Coluna: Margem Livre */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
            <Wallet className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-800">Margem Livre (Novo)</h3>
            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {novoEmprestimo.length}
            </span>
          </div>

          {novoEmprestimo.length === 0 ? (
            <p className="text-slate-500 text-sm italic p-4 bg-slate-50 rounded-xl border border-dashed">
              Nenhuma oportunidade encontrada ou margem insuficiente.
            </p>
          ) : (
            <div className="space-y-3">
              {novoEmprestimo.map((op, idx) => (
                <div key={idx} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{op.bancoNome}</h4>
                      <p className="text-xs text-slate-500">{op.produtoNome}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => setInsightModal({
                          open: true,
                          context: {
                            bancoNome: op.bancoNome,
                            produtoNome: op.produtoNome,
                            clienteEspecie: cliente.especie,
                            clienteIdade: cliente.idade,
                            valorParcela: op.valorParcela,
                            prazo: op.prazo
                          }
                        })}
                        className="p-2 bg-brand/10 text-brand rounded-lg hover:bg-brand/20 transition-colors shadow-sm"
                        title="Ver Insight da IA"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 font-medium uppercase">Valor Liberado</p>
                        <p className="text-lg font-black text-emerald-600">R$ {op.valorLiberado.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm bg-slate-50 dark:bg-zinc-800/50 p-2 rounded-lg">
                    <span className="text-slate-600 dark:text-zinc-400">
                      <strong>{op.prazo}x</strong> de R$ {op.valorParcela.toFixed(2)}
                    </span>
                    <span className="text-slate-500 font-medium">{op.taxaJuros}% a.m</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AiInsightModal 
          isOpen={insightModal.open}
          onClose={() => setInsightModal({ ...insightModal, open: false })}
          context={insightModal.context}
        />

        {/* Coluna: Oportunidades em Contratos Ativos (Port/Refin) */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-200">
            <ArrowRightLeft className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-slate-800">Oportunidades em Dívidas (Portabilidade / Refin)</h3>
          </div>

          <div className="space-y-4">
            <SimuladorTable 
              contratos={contratos} 
              oportunidades={oportunidades} 
              clienteId={clienteVinculado?.id}
              clienteNome={clienteVinculado?.nome || cliente.nome}
              clienteCpf={clienteVinculado?.cpf}
              onOpenInsight={(ctx) => setInsightModal({ open: true, context: { ...ctx, clienteIdade: cliente.idade } })}
            />
          </div>
        </div>

      </div>

      {/* Modal de Cadastro */}
      <LeadFormModal
        open={showCadastroModal}
        onClose={() => setShowCadastroModal(false)}
        leadSelecionado={null}
        initialNome={cliente.nome || ""}
        onSuccess={handleCadastroSuccess}
      />
    </div>
  );
}
