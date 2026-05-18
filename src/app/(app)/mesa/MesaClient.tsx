"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Clock, CheckCircle2, AlertTriangle, Phone,
  ArrowRight, Calculator, Brain, Building2, TrendingUp, DollarSign,
  CalendarClock, ChevronRight, RefreshCw, MessageSquare, Zap, List
} from "lucide-react";

type Proposta = {
  id: string; clienteNome: string; clienteCpf?: string|null; clienteTelefone?: string|null;
  bancoNome?: string|null; bancoOrigem?: string|null; status: string;
  tipoOperacao?: string|null; convenioNome?: string|null;
  codigoPropostaBanco?: string|null; vendedorNome?: string|null; vendedorEmail?: string|null;
  numeroBeneficio?: string|null;
  valorLiberado?: number|null; valorParcela?: number|null; valorComissao?: number|null;
  taxaJuros?: number|null; prazo?: number|null;
  saldoDevedor?: number|null; saldoRetornado?: boolean;
  dataSolicitacaoSaldo?: string|null; dataRetornoSaldo?: string|null;
  dataProximoRetorno?: string|null;
  digitadaEm?: string|null; aprovadaEm?: string|null;
  createdAt: string; updatedAt: string;
};

type LeadHoje = {
  id: string; nome: string; telefone?: string|null; status: string;
  vendedorNome?: string|null; proximoContato?: string|null; observacoes?: string|null;
};

const STATUS_COLS = ["RASCUNHO","SIMULADA","DIGITADA","PENDENTE","APROVADA"] as const;
const STATUS_LABEL: Record<string,string> = {
  RASCUNHO:"Rascunho", SIMULADA:"Simulada", DIGITADA:"Digitada",
  PENDENTE:"Pendente", APROVADA:"Aprovada", PAGA:"Paga",
  REPROVADA:"Reprovada", CANCELADA:"Cancelada"
};
const STATUS_COLOR: Record<string,string> = {
  RASCUNHO:"bg-zinc-400", SIMULADA:"bg-blue-400", DIGITADA:"bg-sky-500",
  PENDENTE:"bg-amber-500", APROVADA:"bg-emerald-500"
};

function diasUteis(desde: Date): number {
  let d = 0; const hoje = new Date();
  const cur = new Date(desde);
  while (cur < hoje) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) d++;
  }
  return d;
}

function diasNoStatus(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
}

export function MesaClient({ sessao, propostas, leadsHoje, ultimasPropostas=[], kpis }: {
  sessao: { nomeUsuario: string|null; nomeEmpresa: string };
  propostas: Proposta[];
  leadsHoje: LeadHoje[];
  ultimasPropostas?: Proposta[];
  kpis: { totalPagas: number; volumeMes: number; comissaoMes: number };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string|null>(null);
  const [propostasState, setPropostasState] = useState(propostas);
  const [porPagina, setPorPagina] = useState(10);
  const [pagina, setPagina] = useState(1);

  const saudacao = (() => { const h = new Date().getHours(); return h<12?"Bom dia":h<18?"Boa tarde":"Boa noite"; })();
  const emAndamento = propostasState.filter(p => !["PAGA","CANCELADA"].includes(p.status));
  const aguardandoSaldo = propostasState.filter(p => p.dataSolicitacaoSaldo && !p.saldoRetornado);
  const followUpsHoje = propostasState.filter(p => {
    if (!p.dataProximoRetorno) return false;
    const d = new Date(p.dataProximoRetorno);
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    return d >= hoje && d < new Date(hoje.getTime() + 86400000);
  });
  const comissaoPotencial = emAndamento.reduce((s,p) => s + (p.valorComissao||0), 0);

  const marcarSaldoRetornado = async (id: string) => {
    setLoading(id);
    try {
      const res = await fetch("/api/propostas/saldo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propostaId: id, saldoRetornado: true }),
      });
      if (res.ok) {
        setPropostasState(prev => prev.map(p => p.id === id ? { ...p, saldoRetornado: true, dataRetornoSaldo: new Date().toISOString() } : p));
      }
    } catch (e) { console.error(e); }
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 mb-1">
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">Mesa do Operador</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{saudacao}, {sessao.nomeUsuario || "Operador"} 👋</h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-sm">
            Seu painel de trabalho — {sessao.nomeEmpresa} · {new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}
          </p>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: <Zap className="h-5 w-5 text-sky-500"/>, val: emAndamento.length, label: "Em Andamento", color: "sky" },
            { icon: <Clock className="h-5 w-5 text-amber-500"/>, val: aguardandoSaldo.length, label: "Aguardando Saldo", color: "amber" },
            { icon: <CalendarClock className="h-5 w-5 text-violet-500"/>, val: followUpsHoje.length + leadsHoje.length, label: "Follow-ups Hoje", color: "violet" },
            { icon: <DollarSign className="h-5 w-5 text-emerald-500"/>, val: `R$ ${comissaoPotencial.toLocaleString("pt-BR",{maximumFractionDigits:0})}`, label: "Comissão Potencial", color: "emerald" },
            { icon: <TrendingUp className="h-5 w-5 text-emerald-500"/>, val: `${kpis.totalPagas} pagas`, label: `R$ ${kpis.volumeMes.toLocaleString("pt-BR",{maximumFractionDigits:0})} no mês`, color: "emerald" },
          ].map((k,i) => (
            <div key={i} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
              <div className="mb-2">{k.icon}</div>
              <p className="text-xl font-bold tabular-nums">{k.val}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Pipeline Kanban */}
        <section>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Building2 className="h-5 w-5 text-sky-500"/>Pipeline de Operações</h2>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {STATUS_COLS.map(col => {
              const items = emAndamento.filter(p => p.status === col);
              return (
                <div key={col} className="min-w-[260px] flex-shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 rounded-full ${STATUS_COLOR[col]}`}/>
                    <span className="text-sm font-semibold">{STATUS_LABEL[col]}</span>
                    <span className="text-xs text-zinc-400 ml-auto">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <div className="text-xs text-zinc-400 text-center py-8 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">Nenhuma</div>
                    ) : items.map(p => {
                      const dias = diasNoStatus(p.updatedAt);
                      const saldoStatus = !p.dataSolicitacaoSaldo ? null : p.saldoRetornado ? "ok" : diasUteis(new Date(p.dataSolicitacaoSaldo)) > 5 ? "atrasado" : "aguardando";
                      return (
                        <div key={p.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:shadow-md hover:border-sky-300 transition cursor-pointer" onClick={() => router.push(`/esteira?proposta=${p.id}`)}>
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-semibold text-sm truncate flex-1">{p.clienteNome}</p>
                            <div className="flex items-center gap-1">
                              {p.tipoOperacao && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                                p.tipoOperacao==="PORTABILIDADE"?"bg-sky-100 text-sky-700":
                                p.tipoOperacao==="PORTABILIDADE_REFIN"?"bg-violet-100 text-violet-700":
                                p.tipoOperacao==="REFINANCIAMENTO"?"bg-amber-100 text-amber-700":
                                p.tipoOperacao==="EMPRESTIMO_CONSIGNADO"?"bg-emerald-100 text-emerald-700":
                                p.tipoOperacao==="CARTAO_CONSIGNADO"?"bg-pink-100 text-pink-700":
                                p.tipoOperacao==="CARTAO_BENEFICIO"?"bg-rose-100 text-rose-700":
                                "bg-zinc-100 text-zinc-700"
                              }`}>{p.tipoOperacao==="PORTABILIDADE"?"Port":p.tipoOperacao==="PORTABILIDADE_REFIN"?"P+R":p.tipoOperacao==="REFINANCIAMENTO"?"Refin":p.tipoOperacao==="EMPRESTIMO_CONSIGNADO"?"Novo":p.tipoOperacao==="CARTAO_CONSIGNADO"?"Cart":p.tipoOperacao==="CARTAO_BENEFICIO"?"Ben":p.tipoOperacao?.substring(0,4)}</span>}
                              {dias > 3 && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">{dias}d</span>}
                            </div>
                          </div>
                          <div className="space-y-1 text-[11px] text-zinc-500">
                            <p>{p.bancoOrigem ? `${p.bancoOrigem} → ` : ""}<span className="font-medium text-zinc-700 dark:text-zinc-300">{p.bancoNome || "—"}</span></p>
                            {p.valorLiberado && <p className="font-semibold text-emerald-600">R$ {p.valorLiberado.toLocaleString("pt-BR",{maximumFractionDigits:0})}</p>}
                            {p.taxaJuros && <p>{p.taxaJuros.toFixed(2)}% · {p.prazo}x</p>}
                          </div>
                          {saldoStatus && (
                            <div className="mt-2 flex items-center gap-1.5">
                              {saldoStatus==="ok" ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500"/> : saldoStatus==="atrasado" ? <AlertTriangle className="h-3.5 w-3.5 text-red-500"/> : <Clock className="h-3.5 w-3.5 text-amber-500"/>}
                              <span className={`text-[10px] font-semibold ${saldoStatus==="ok"?"text-emerald-600":saldoStatus==="atrasado"?"text-red-600":"text-amber-600"}`}>
                                {saldoStatus==="ok"?"Saldo OK":saldoStatus==="atrasado"?"Saldo Atrasado":"Aguardando Saldo"}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Retornos de Saldo */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><RefreshCw className="h-5 w-5 text-amber-500"/>Retornos de Saldo</h2>
          {aguardandoSaldo.length === 0 ? (
            <div className="text-center py-10 text-zinc-400">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400"/>
              <p className="text-sm">Nenhum saldo pendente! 🎉</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-zinc-50 dark:bg-zinc-800/40">
                  <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Cliente</th>
                  <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Banco Origem</th>
                  <th className="text-left px-4 py-2.5 font-medium text-zinc-500">Banco Receptor</th>
                  <th className="text-center px-4 py-2.5 font-medium text-zinc-500">Solicitado</th>
                  <th className="text-center px-4 py-2.5 font-medium text-zinc-500">Prazo (5 d.u.)</th>
                  <th className="text-center px-4 py-2.5 font-medium text-zinc-500">Status</th>
                  <th className="text-center px-4 py-2.5 font-medium text-zinc-500">Ação</th>
                </tr></thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {aguardandoSaldo.map(p => {
                    const solicitado = p.dataSolicitacaoSaldo ? new Date(p.dataSolicitacaoSaldo) : null;
                    const du = solicitado ? diasUteis(solicitado) : 0;
                    const atrasado = du > 5;
                    return (
                      <tr key={p.id} className={atrasado ? "bg-red-50/50 dark:bg-red-950/10" : ""}>
                        <td className="px-4 py-3 font-semibold">{p.clienteNome}</td>
                        <td className="px-4 py-3">{p.bancoOrigem || "—"}</td>
                        <td className="px-4 py-3 font-medium">{p.bancoNome || "—"}</td>
                        <td className="px-4 py-3 text-center tabular-nums">{solicitado?.toLocaleDateString("pt-BR") || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${atrasado?"text-red-600":"text-zinc-600"}`}>{du}/5 dias</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {atrasado ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                              <AlertTriangle className="h-3 w-3"/>Atrasado ({du-5}d)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                              <Clock className="h-3 w-3"/>Aguardando
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => marcarSaldoRetornado(p.id)} disabled={loading===p.id}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition disabled:opacity-50">
                            {loading===p.id ? "..." : "✓ Retornado"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Follow-ups Hoje */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Propostas com retorno hoje */}
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2"><CalendarClock className="h-5 w-5 text-violet-500"/>Retornos Agendados Hoje</h2>
            {followUpsHoje.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-6">Nenhum retorno agendado para hoje</p>
            ) : (
              <div className="space-y-2">
                {followUpsHoje.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition cursor-pointer" onClick={() => router.push(`/esteira?proposta=${p.id}`)}>
                    <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-violet-600"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.clienteNome}</p>
                      <p className="text-[11px] text-zinc-500">{p.bancoOrigem ? `${p.bancoOrigem} → ` : ""}{p.bancoNome} · R$ {(p.valorLiberado||0).toLocaleString("pt-BR",{maximumFractionDigits:0})}</p>
                    </div>
                    {p.clienteTelefone && (
                      <a href={`https://wa.me/55${p.clienteTelefone.replace(/\D/g,"")}`} target="_blank" className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition" onClick={e => e.stopPropagation()}>
                        <MessageSquare className="h-4 w-4"/>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Leads com contato hoje */}
          <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
            <h2 className="text-base font-bold mb-4 flex items-center gap-2"><Phone className="h-5 w-5 text-sky-500"/>Leads para Contatar Hoje</h2>
            {leadsHoje.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-6">Nenhum lead agendado para hoje</p>
            ) : (
              <div className="space-y-2">
                {leadsHoje.map(l => (
                  <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition cursor-pointer" onClick={() => router.push(`/leads?lead=${l.id}`)}>
                    <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                      <Phone className="h-4 w-4 text-sky-600"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{l.nome}</p>
                      <p className="text-[11px] text-zinc-500">{l.observacoes ? l.observacoes.substring(0, 50) : l.status}</p>
                    </div>
                    {l.telefone && (
                      <a href={`https://wa.me/55${l.telefone.replace(/\D/g,"")}`} target="_blank" className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition" onClick={e => e.stopPropagation()}>
                        <MessageSquare className="h-4 w-4"/>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Últimas Propostas Digitadas */}
        <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-lg font-bold flex items-center gap-2"><List className="h-5 w-5 text-sky-500"/>Últimas Propostas Digitadas</h2>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-zinc-500">Exibir:</span>
                {[5,10,20,50,100].map(n => (
                  <button key={n} onClick={() => { setPorPagina(n); setPagina(1); }}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${porPagina===n ? "bg-sky-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"}`}>
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-xs text-zinc-400">{ultimasPropostas.length} total</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead><tr className="bg-zinc-50 dark:bg-zinc-800/40 sticky top-0">
                <th className="text-left px-3 py-2 font-medium text-zinc-500">#</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Nome</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">CPF</th>
                <th className="text-center px-3 py-2 font-medium text-zinc-500">Data</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Banco</th>
                <th className="text-center px-3 py-2 font-medium text-zinc-500">Tipo</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Convênio</th>
                <th className="text-right px-3 py-2 font-medium text-zinc-500">Parcela</th>
                <th className="text-right px-3 py-2 font-medium text-zinc-500">Saldo Dev.</th>
                <th className="text-right px-3 py-2 font-medium text-zinc-500">Liberado</th>
                <th className="text-center px-3 py-2 font-medium text-zinc-500">Status</th>
                <th className="text-center px-3 py-2 font-medium text-zinc-500">Ret. Saldo</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Vendedor</th>
                <th className="text-left px-3 py-2 font-medium text-zinc-500">Tel. Cliente</th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {ultimasPropostas.slice((pagina-1)*porPagina, pagina*porPagina).map((p, idx) => {
                  const statusColors: Record<string,string> = {
                    PAGA: "bg-emerald-100 text-emerald-700",
                    APROVADA: "bg-green-100 text-green-700",
                    DIGITADA: "bg-sky-100 text-sky-700",
                    PENDENTE: "bg-amber-100 text-amber-700",
                    SIMULADA: "bg-blue-100 text-blue-700",
                    RASCUNHO: "bg-zinc-100 text-zinc-600",
                    REPROVADA: "bg-red-100 text-red-700",
                    CANCELADA: "bg-zinc-100 text-zinc-400",
                  };
                  const tipoLabels: Record<string,string> = {
                    PORTABILIDADE:"Port", PORTABILIDADE_REFIN:"P+R",
                    REFINANCIAMENTO:"Refin", EMPRESTIMO_CONSIGNADO:"Novo",
                    CARTAO_CONSIGNADO:"Cartão", CARTAO_BENEFICIO:"Benefício",
                  };
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/30 cursor-pointer" onClick={() => router.push(`/esteira?proposta=${p.id}`)}>
                      <td className="px-3 py-2 text-zinc-400 tabular-nums">{(pagina-1)*porPagina + idx + 1}</td>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap max-w-[180px] truncate">{p.clienteNome}</td>
                      <td className="px-3 py-2 tabular-nums text-zinc-500 whitespace-nowrap">{p.clienteCpf || "—"}</td>
                      <td className="px-3 py-2 text-center tabular-nums whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString("pt-BR")}</td>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{p.bancoNome || "—"}</td>
                      <td className="px-3 py-2 text-center"><span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                        p.tipoOperacao==="PORTABILIDADE"?"bg-sky-100 text-sky-700":
                        p.tipoOperacao==="PORTABILIDADE_REFIN"?"bg-violet-100 text-violet-700":
                        p.tipoOperacao==="REFINANCIAMENTO"?"bg-amber-100 text-amber-700":
                        p.tipoOperacao==="EMPRESTIMO_CONSIGNADO"?"bg-emerald-100 text-emerald-700":
                        "bg-zinc-100 text-zinc-700"
                      }`}>{tipoLabels[p.tipoOperacao||"" ] || p.tipoOperacao?.substring(0,6) || "—"}</span></td>
                      <td className="px-3 py-2 whitespace-nowrap">{p.convenioNome || "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.valorParcela ? `R$ ${p.valorParcela.toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.saldoDevedor ? `R$ ${p.saldoDevedor.toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold text-emerald-600">{p.valorLiberado ? `R$ ${p.valorLiberado.toLocaleString("pt-BR",{minimumFractionDigits:2})}` : "—"}</td>
                      <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusColors[p.status] || "bg-zinc-100 text-zinc-600"}`}>{STATUS_LABEL[p.status] || p.status}</span></td>
                      <td className="px-3 py-2 text-center">
                        {p.dataSolicitacaoSaldo ? (
                          p.saldoRetornado ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mx-auto"/> : <Clock className="h-3.5 w-3.5 text-amber-500 mx-auto"/>
                        ) : <span className="text-zinc-300">—</span>}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{p.vendedorNome || "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">{p.clienteTelefone || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Paginação */}
          {ultimasPropostas.length > porPagina && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={() => setPagina(p => Math.max(1, p-1))} disabled={pagina===1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition disabled:opacity-30">
                ← Anterior
              </button>
              <span className="text-xs text-zinc-500 tabular-nums">
                Página {pagina} de {Math.ceil(ultimasPropostas.length / porPagina)} · Exibindo {(pagina-1)*porPagina+1}–{Math.min(pagina*porPagina, ultimasPropostas.length)} de {ultimasPropostas.length}
              </span>
              <button onClick={() => setPagina(p => Math.min(Math.ceil(ultimasPropostas.length / porPagina), p+1))} disabled={pagina >= Math.ceil(ultimasPropostas.length / porPagina)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 transition disabled:opacity-30">
                Próxima →
              </button>
            </div>
          )}
        </section>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: <Calculator className="h-5 w-5"/>, title: "Nova Simulação", desc: "Upload de HISCON para análise", href: "/simulador" },
            { icon: <Brain className="h-5 w-5"/>, title: "Consultar Regras", desc: "Pergunte à IA sobre qualquer banco", href: "/conhecimento" },
            { icon: <Building2 className="h-5 w-5"/>, title: "Mapa de Portabilidade", desc: "Compare taxas e coeficientes", href: "/mapa-portabilidade" },
          ].map(a => (
            <button key={a.href} onClick={() => router.push(a.href)} className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-left hover:shadow-md hover:border-sky-300 transition">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 flex items-center justify-center group-hover:scale-110 transition">{a.icon}</div>
                <ArrowRight className="h-4 w-4 text-zinc-300 ml-auto group-hover:text-sky-500 group-hover:translate-x-1 transition"/>
              </div>
              <p className="font-semibold text-sm">{a.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{a.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
