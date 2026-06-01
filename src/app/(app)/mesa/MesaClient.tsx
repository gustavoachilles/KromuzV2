"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Clock, CheckCircle2, AlertTriangle, Phone,
  ArrowRight, Calculator, Brain, Building2, TrendingUp, DollarSign,
  CalendarClock, ChevronRight, RefreshCw, MessageSquare, Zap, List,
  Search, X, Loader2, FileSearch, ShieldCheck, Landmark, Briefcase
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
  sessao: { nomeUsuario: string|null; nomeEmpresa: string; isAdmin?: boolean };
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

  // ── Consulta Rápida (CPF) ──
  const [consultaModal, setConsultaModal] = useState(false);
  const [consultaTipo, setConsultaTipo] = useState<"INSS"|"FGTS"|"CLT"|null>(null);
  const [consultaCpf, setConsultaCpf] = useState("");
  const [consultaTelefone, setConsultaTelefone] = useState("");
  const [consultaNascimento, setConsultaNascimento] = useState("");
  const [consultaEnviando, setConsultaEnviando] = useState(false);
  const [consultaResultado, setConsultaResultado] = useState<{success:boolean;message:string}|null>(null);

  // ── Consulta de Tabelas ──
  const [tabelasModalOpen, setTabelasModalOpen] = useState(false);
  const [tabelas, setTabelas] = useState<any[]>([]);
  const [tabelasLoading, setTabelasLoading] = useState(false);
  const [filtroBanco, setFiltroBanco] = useState("");
  const [filtroPrazo, setFiltroPrazo] = useState("");
  const [filtroConvenio, setFiltroConvenio] = useState("");

  // ── Nova Proposta Manual ──
  const [novaPropostaModal, setNovaPropostaModal] = useState(false);
  const [novaPropostaSaving, setNovaPropostaSaving] = useState(false);
  const [npBancos, setNpBancos] = useState<{id:string;nome:string}[]>([]);
  const [npConvenios, setNpConvenios] = useState<{id:string;nome:string}[]>([]);
  const [npBancosLoaded, setNpBancosLoaded] = useState(false);

  // Busca de cliente
  const [clienteQuery, setClienteQuery] = useState("");
  const [clienteResults, setClienteResults] = useState<any[]>([]);
  const [clienteSearching, setClienteSearching] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [showClienteDropdown, setShowClienteDropdown] = useState(false);
  const searchTimeout = useState<NodeJS.Timeout | null>(null);

  const [npForm, setNpForm] = useState({
    clienteNome: "", clienteCpf: "", clienteTelefone: "",
    tipoOperacao: "EMPRESTIMO_CONSIGNADO",
    bancoNome: "", bancoOrigem: "", convenioNome: "",
    valorLiberado: "", valorParcela: "",
    prazo: "", taxaJuros: "", saldoDevedor: "",
    observacoes: "", leadId: "",
  });

  const updateNp = (field: string, value: string) => setNpForm(prev => ({ ...prev, [field]: value }));

  // Abrir modal e carregar bancos/convênios
  const abrirNovaPropostaModal = async () => {
    setNovaPropostaModal(true);
    setClienteSelecionado(null);
    setClienteQuery("");
    setNpForm({
      clienteNome: "", clienteCpf: "", clienteTelefone: "",
      tipoOperacao: "EMPRESTIMO_CONSIGNADO",
      bancoNome: "", bancoOrigem: "", convenioNome: "",
      valorLiberado: "", valorParcela: "",
      prazo: "", taxaJuros: "", saldoDevedor: "",
      observacoes: "", leadId: "",
    });
    if (!npBancosLoaded) {
      try {
        const [bRes, cRes] = await Promise.all([fetch("/api/bancos"), fetch("/api/convenios")]);
        if (bRes.ok) setNpBancos((await bRes.json()).map((b: any) => ({ id: b.id, nome: b.nome })));
        if (cRes.ok) setNpConvenios((await cRes.json()).map((c: any) => ({ id: c.id, nome: c.nome })));
        setNpBancosLoaded(true);
      } catch {}
    }
  };

  // Buscar clientes com debounce
  const buscarClientes = (query: string) => {
    setClienteQuery(query);
    setShowClienteDropdown(true);
    if (searchTimeout[0]) clearTimeout(searchTimeout[0]);
    if (query.length < 2) { setClienteResults([]); return; }
    searchTimeout[0] = setTimeout(async () => {
      setClienteSearching(true);
      try {
        const res = await fetch(`/api/leads/buscar?q=${encodeURIComponent(query)}`);
        if (res.ok) setClienteResults(await res.json());
      } catch {}
      setClienteSearching(false);
    }, 300);
  };

  const selecionarCliente = (lead: any) => {
    setClienteSelecionado(lead);
    setClienteQuery(lead.nome);
    setShowClienteDropdown(false);
    setNpForm(prev => ({
      ...prev,
      clienteNome: lead.nome,
      clienteCpf: lead.cpf || "",
      clienteTelefone: lead.telefone || "",
      leadId: lead.id,
    }));
  };

  const limparCliente = () => {
    setClienteSelecionado(null);
    setClienteQuery("");
    setNpForm(prev => ({ ...prev, clienteNome: "", clienteCpf: "", clienteTelefone: "", leadId: "" }));
  };

  const salvarNovaProposta = async () => {
    if (!npForm.clienteNome) return alert("Preencha o nome do cliente");
    setNovaPropostaSaving(true);
    try {
      const payload: any = {
        clienteNome: npForm.clienteNome,
        clienteCpf: npForm.clienteCpf || undefined,
        clienteTelefone: npForm.clienteTelefone || undefined,
        tipoOperacao: npForm.tipoOperacao,
        bancoNome: npForm.bancoNome || undefined,
        bancoOrigem: npForm.bancoOrigem || undefined,
        convenioNome: npForm.convenioNome || undefined,
        valorLiberado: npForm.valorLiberado ? parseFloat(npForm.valorLiberado) : undefined,
        valorParcela: npForm.valorParcela ? parseFloat(npForm.valorParcela) : undefined,
        prazo: npForm.prazo ? parseInt(npForm.prazo) : undefined,
        taxaJuros: npForm.taxaJuros ? parseFloat(npForm.taxaJuros) : undefined,
        observacoes: npForm.observacoes || undefined,
        leadId: npForm.leadId || undefined,
      };
      const res = await fetch("/api/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const p = await res.json();
        router.push(`/esteira?proposta=${p.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Erro ao criar proposta");
      }
    } catch (e) {
      alert("Erro na requisição");
    }
    setNovaPropostaSaving(false);
  };

  const abrirConsultaTabelas = async () => {
    setTabelasModalOpen(true);
    if (tabelas.length === 0) {
      setTabelasLoading(true);
      try {
        const res = await fetch("/api/tabelas-comissao");
        if (res.ok) setTabelas(await res.json());
      } catch (err) {}
      setTabelasLoading(false);
    }
  };

  const formatarCpf = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 6) return `${nums.slice(0,3)}.${nums.slice(3)}`;
    if (nums.length <= 9) return `${nums.slice(0,3)}.${nums.slice(3,6)}.${nums.slice(6)}`;
    return `${nums.slice(0,3)}.${nums.slice(3,6)}.${nums.slice(6,9)}-${nums.slice(9)}`;
  };

  const formatarTelefone = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 2) return nums;
    if (nums.length <= 7) return `(${nums.slice(0,2)}) ${nums.slice(2)}`;
    return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`;
  };

  const formatarData = (value: string) => {
    const nums = value.replace(/\D/g, "").slice(0, 8);
    if (nums.length <= 2) return nums;
    if (nums.length <= 4) return `${nums.slice(0,2)}/${nums.slice(2)}`;
    return `${nums.slice(0,2)}/${nums.slice(2,4)}/${nums.slice(4)}`;
  };

  const fecharConsultaModal = () => {
    setConsultaModal(false);
    setConsultaTipo(null);
    setConsultaCpf("");
    setConsultaTelefone("");
    setConsultaNascimento("");
    setConsultaResultado(null);
  };

  const enviarConsulta = async () => {
    if (!consultaTipo) return;
    const cpfLimpo = consultaCpf.replace(/\D/g, "");
    if (cpfLimpo.length !== 11) { alert("CPF inválido. Informe 11 dígitos."); return; }
    if ((consultaTipo === "FGTS" || consultaTipo === "CLT") && !consultaTelefone.replace(/\D/g, "")) {
      alert("Telefone é obrigatório para consultas FGTS/CLT."); return;
    }
    if ((consultaTipo === "FGTS" || consultaTipo === "CLT") && consultaNascimento.replace(/\D/g, "").length < 8) {
      alert("Data de nascimento inválida."); return;
    }

    setConsultaEnviando(true);
    setConsultaResultado(null);
    try {
      // Converter data DD/MM/YYYY para ISO
      let dataNasc: string | undefined;
      if (consultaNascimento) {
        const parts = consultaNascimento.split("/");
        if (parts.length === 3) dataNasc = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
      const res = await fetch("/api/consultas/executar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: consultaTipo,
          cpf: cpfLimpo,
          telefone: consultaTelefone.replace(/\D/g, "") || undefined,
          dataNascimento: dataNasc,
          origem: "MESA",
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setConsultaResultado({ success: true, message: json.message || "Consulta enviada com sucesso!" });
      } else {
        setConsultaResultado({ success: false, message: json.error || "Erro ao enviar consulta." });
      }
    } catch (e: any) {
      setConsultaResultado({ success: false, message: "Erro de conexão. Tente novamente." });
    }
    setConsultaEnviando(false);
  };

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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
          {/* Botão Consulta Rápida */}
          <button onClick={() => setConsultaModal(true)} className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-left hover:shadow-md hover:border-emerald-400 transition">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition"><FileSearch className="h-5 w-5"/></div>
              <ArrowRight className="h-4 w-4 text-zinc-300 ml-auto group-hover:text-emerald-500 group-hover:translate-x-1 transition"/>
            </div>
            <p className="font-semibold text-sm">Consulta Rápida</p>
            <p className="text-xs text-zinc-500 mt-0.5">INSS, FGTS ou CLT via robô</p>
          </button>
          {/* Botão Consulta Tabelas */}
          <button onClick={abrirConsultaTabelas} className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-left hover:shadow-md hover:border-violet-400 transition">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 flex items-center justify-center group-hover:scale-110 transition"><List className="h-5 w-5"/></div>
              <ArrowRight className="h-4 w-4 text-zinc-300 ml-auto group-hover:text-violet-500 group-hover:translate-x-1 transition"/>
            </div>
            <p className="font-semibold text-sm">Tabelas da Mesa</p>
            <p className="text-xs text-zinc-500 mt-0.5">Coeficientes e Prazos</p>
          </button>
          {/* Botão Nova Proposta Manual */}
          <button onClick={abrirNovaPropostaModal} className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 text-left hover:shadow-md hover:border-orange-400 transition">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center group-hover:scale-110 transition"><Briefcase className="h-5 w-5"/></div>
              <ArrowRight className="h-4 w-4 text-zinc-300 ml-auto group-hover:text-orange-500 group-hover:translate-x-1 transition"/>
            </div>
            <p className="font-semibold text-sm">Nova Proposta</p>
            <p className="text-xs text-zinc-500 mt-0.5">Cadastro Manual</p>
          </button>
        </div>
      </div>

      {/* ══════════ MODAL CONSULTA RÁPIDA ══════════ */}
      {consultaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={fecharConsultaModal}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-emerald-500" />
                Consulta Rápida
              </h2>
              <button onClick={fecharConsultaModal} className="text-zinc-400 hover:text-zinc-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Escolha do tipo */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tipo de Consulta</label>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { tipo: "INSS" as const, icon: <ShieldCheck className="h-5 w-5" />, desc: "Margem / Benefício", color: "emerald" },
                    { tipo: "FGTS" as const, icon: <Landmark className="h-5 w-5" />, desc: "Saque Aniversário", color: "blue" },
                    { tipo: "CLT" as const, icon: <Briefcase className="h-5 w-5" />, desc: "Consignado Privado", color: "violet" },
                  ]).map(item => {
                    const selected = consultaTipo === item.tipo;
                    const colors: Record<string, { bg: string; border: string; text: string }> = {
                      emerald: { bg: selected ? "bg-emerald-50 dark:bg-emerald-950/40" : "bg-white dark:bg-zinc-800", border: selected ? "border-emerald-500" : "border-zinc-200 dark:border-zinc-700", text: selected ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-600 dark:text-zinc-400" },
                      blue: { bg: selected ? "bg-blue-50 dark:bg-blue-950/40" : "bg-white dark:bg-zinc-800", border: selected ? "border-blue-500" : "border-zinc-200 dark:border-zinc-700", text: selected ? "text-blue-700 dark:text-blue-400" : "text-zinc-600 dark:text-zinc-400" },
                      violet: { bg: selected ? "bg-violet-50 dark:bg-violet-950/40" : "bg-white dark:bg-zinc-800", border: selected ? "border-violet-500" : "border-zinc-200 dark:border-zinc-700", text: selected ? "text-violet-700 dark:text-violet-400" : "text-zinc-600 dark:text-zinc-400" },
                    };
                    const c = colors[item.color];
                    return (
                      <button
                        key={item.tipo}
                        onClick={() => { setConsultaTipo(item.tipo); setConsultaResultado(null); }}
                        className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${c.bg} ${c.border} ${c.text} hover:shadow-md`}
                      >
                        {item.icon}
                        <span className="text-sm font-bold">{item.tipo}</span>
                        <span className="text-[10px] text-zinc-500">{item.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Formulário dinâmico */}
              {consultaTipo && (
                <div className="space-y-4 pt-2">
                  {/* CPF — sempre presente */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">CPF *</label>
                    <input
                      type="text"
                      value={consultaCpf}
                      onChange={e => setConsultaCpf(formatarCpf(e.target.value))}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                    />
                  </div>

                  {/* Telefone e Data de Nascimento — FGTS e CLT */}
                  {(consultaTipo === "FGTS" || consultaTipo === "CLT") && (
                    <>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Telefone *</label>
                        <input
                          type="text"
                          value={consultaTelefone}
                          onChange={e => setConsultaTelefone(formatarTelefone(e.target.value))}
                          placeholder="(51) 99999-9999"
                          maxLength={15}
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Data de Nascimento *</label>
                        <input
                          type="text"
                          value={consultaNascimento}
                          onChange={e => setConsultaNascimento(formatarData(e.target.value))}
                          placeholder="DD/MM/AAAA"
                          maxLength={10}
                          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                        />
                      </div>
                    </>
                  )}

                  {/* Resultado da consulta */}
                  {consultaResultado && (
                    <div className={`rounded-xl p-4 text-sm flex items-start gap-3 ${
                      consultaResultado.success
                        ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                        : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                    }`}>
                      {consultaResultado.success
                        ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                        : <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />}
                      <p>{consultaResultado.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={fecharConsultaModal} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-200 transition">
                Cancelar
              </button>
              <button
                onClick={enviarConsulta}
                disabled={!consultaTipo || consultaCpf.replace(/\D/g, "").length !== 11 || consultaEnviando}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {consultaEnviando ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Consultando...</>
                ) : (
                  <><Search className="h-4 w-4" /> Realizar Consulta</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════ MODAL CONSULTA TABELAS ══════════ */}
      {tabelasModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setTabelasModalOpen(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-5xl mx-4 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 text-violet-600 flex items-center justify-center">
                  <List className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Consulta de Tabelas da Mesa</h2>
                  <p className="text-xs text-zinc-500">Veja coeficientes, taxas e prazos para cotar com o cliente.</p>
                </div>
              </div>
              <button onClick={() => setTabelasModalOpen(false)} className="rounded-xl p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Filtros */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap gap-3 items-center shrink-0">
              <input 
                type="text" placeholder="Filtrar por banco..." 
                value={filtroBanco} onChange={e => setFiltroBanco(e.target.value)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input 
                type="text" placeholder="Convênio / Produto..." 
                value={filtroConvenio} onChange={e => setFiltroConvenio(e.target.value)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <input 
                type="number" placeholder="Prazo max..." 
                value={filtroPrazo} onChange={e => setFiltroPrazo(e.target.value)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 w-32"
              />
              <span className="text-xs text-zinc-400 ml-auto bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-full font-medium">
                {tabelas.filter(t => 
                  (!filtroBanco || (t.banco?.nome || "").toLowerCase().includes(filtroBanco.toLowerCase())) &&
                  (!filtroConvenio || (t.convenio?.nome || "").toLowerCase().includes(filtroConvenio.toLowerCase()) || (t.produto?.nomeProduto || "").toLowerCase().includes(filtroConvenio.toLowerCase())) &&
                  (!filtroPrazo || t.prazo >= parseInt(filtroPrazo))
                ).length} tabelas
              </span>
            </div>

            {/* Tabela de Resultados */}
            <div className="flex-1 overflow-auto p-6">
              {tabelasLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-500 mb-4" />
                  <p>Carregando as {tabelas.length > 0 ? "regras" : "centenas de tabelas"}...</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500">
                      <th className="pb-3 font-semibold">Banco</th>
                      <th className="pb-3 font-semibold">Convênio / Produto</th>
                      <th className="pb-3 font-semibold">Tabela</th>
                      <th className="pb-3 font-semibold">Prazo</th>
                      <th className="pb-3 font-semibold">Taxa</th>
                      <th className="pb-3 font-semibold text-right">Coeficiente</th>
                      {sessao.isAdmin && (
                        <>
                          <th className="pb-3 font-semibold text-right text-emerald-600">Flat (%)</th>
                          <th className="pb-3 font-semibold text-right text-emerald-600">Repasse (%)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {tabelas
                      .filter(t => 
                        (!filtroBanco || (t.banco?.nome || "").toLowerCase().includes(filtroBanco.toLowerCase())) &&
                        (!filtroConvenio || (t.convenio?.nome || "").toLowerCase().includes(filtroConvenio.toLowerCase()) || (t.produto?.nomeProduto || "").toLowerCase().includes(filtroConvenio.toLowerCase())) &&
                        (!filtroPrazo || t.prazo >= parseInt(filtroPrazo))
                      )
                      .slice(0, 100) // Limitar renderização para n travar o navegador
                      .map(t => (
                        <tr key={t.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition">
                          <td className="py-3 font-medium">{t.banco?.nome || "—"}</td>
                          <td className="py-3">
                            <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 px-2 py-1 rounded text-xs font-semibold mr-2">{t.convenio?.nome}</span>
                            {t.produto?.nomeProduto}
                          </td>
                          <td className="py-3 text-zinc-600 dark:text-zinc-400 max-w-[200px] truncate" title={t.nome}>{t.nome}</td>
                          <td className="py-3">{t.prazo}x</td>
                          <td className="py-3 font-medium">{t.taxaJurosMensal.toFixed(2)}%</td>
                          <td className="py-3 font-bold text-sky-600 text-right">{t.coeficiente.toFixed(6)}</td>
                          {sessao.isAdmin && (
                            <>
                              <td className="py-3 text-right text-emerald-600">{t.comissaoFlatPct?.toFixed(2) || "0.00"}%</td>
                              <td className="py-3 text-right text-emerald-600">{t.comissaoRepassePct?.toFixed(2) || "0.00"}%</td>
                            </>
                          )}
                        </tr>
                      ))}
                    {tabelas.length > 0 && tabelas.filter(t => 
                        (!filtroBanco || (t.banco?.nome || "").toLowerCase().includes(filtroBanco.toLowerCase())) &&
                        (!filtroConvenio || (t.convenio?.nome || "").toLowerCase().includes(filtroConvenio.toLowerCase()) || (t.produto?.nomeProduto || "").toLowerCase().includes(filtroConvenio.toLowerCase())) &&
                        (!filtroPrazo || t.prazo >= parseInt(filtroPrazo))
                      ).length > 100 && (
                      <tr>
                        <td colSpan={sessao.isAdmin ? 8 : 6} className="py-4 text-center text-zinc-500 italic text-xs bg-zinc-50/50 dark:bg-zinc-800/30">
                          Mostrando os primeiros 100 resultados. Use os filtros acima para ser mais específico.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ══════════ MODAL NOVA PROPOSTA MANUAL ══════════ */}
      {novaPropostaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setNovaPropostaModal(false)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <h2 className="font-bold flex items-center gap-2 text-lg">
                <Briefcase className="h-5 w-5 text-orange-500" />
                Nova Proposta Manual
              </h2>
              <button onClick={() => setNovaPropostaModal(false)} className="text-zinc-400 hover:text-zinc-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* ─── BUSCAR CLIENTE ─── */}
              <div className="relative">
                <label className="text-xs font-semibold text-zinc-500 uppercase">Buscar Cliente *</label>
                {clienteSelecionado ? (
                  <div className="mt-1 flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{clienteSelecionado.nome}</p>
                      <p className="text-xs text-zinc-500">{clienteSelecionado.cpf || "Sem CPF"} · {clienteSelecionado.telefone || "Sem telefone"}</p>
                    </div>
                    <button onClick={limparCliente} className="text-zinc-400 hover:text-red-500 transition"><X className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <>
                    <div className="relative mt-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <input
                        type="text"
                        value={clienteQuery}
                        onChange={e => buscarClientes(e.target.value)}
                        onFocus={() => clienteResults.length > 0 && setShowClienteDropdown(true)}
                        onBlur={() => setTimeout(() => setShowClienteDropdown(false), 200)}
                        placeholder="Digite nome, CPF ou telefone..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm"
                      />
                      {clienteSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-orange-500" />}
                    </div>
                    {/* Dropdown de resultados */}
                    {showClienteDropdown && clienteQuery.length >= 2 && (
                      <div className="absolute z-10 mt-1 w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                        {clienteResults.length === 0 && !clienteSearching ? (
                          <div className="p-3 space-y-2">
                            <p className="text-xs text-zinc-400 text-center">Nenhum cliente encontrado</p>
                            <button
                              onClick={() => {
                                setShowClienteDropdown(false);
                                updateNp("clienteNome", clienteQuery);
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-sm font-medium hover:bg-orange-100 transition flex items-center gap-2"
                            >
                              <span className="text-lg">+</span> Cadastrar &quot;{clienteQuery}&quot; como novo cliente
                            </button>
                          </div>
                        ) : (
                          clienteResults.map(lead => (
                            <button
                              key={lead.id}
                              onClick={() => selecionarCliente(lead)}
                              className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                            >
                              <p className="font-semibold text-sm">{lead.nome}</p>
                              <p className="text-xs text-zinc-500">{lead.cpf || "Sem CPF"} · {lead.telefone || "Sem telefone"}</p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ─── DADOS DO CLIENTE (se novo) ─── */}
              {!clienteSelecionado && npForm.clienteNome && (
                <div className="rounded-xl border border-dashed border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-950/20 p-4 space-y-3">
                  <p className="text-xs font-semibold text-orange-600 uppercase flex items-center gap-1">
                    <span>+</span> Novo Cliente
                  </p>
                  <div>
                    <label className="text-xs font-semibold text-zinc-500 uppercase">Nome *</label>
                    <input type="text" value={npForm.clienteNome} onChange={e => updateNp("clienteNome", e.target.value)}
                      className="mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-zinc-500 uppercase">CPF</label>
                      <input type="text" value={npForm.clienteCpf} onChange={e => updateNp("clienteCpf", formatarCpf(e.target.value))}
                        placeholder="000.000.000-00"
                        className="mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-500 uppercase">Telefone</label>
                      <input type="text" value={npForm.clienteTelefone} onChange={e => updateNp("clienteTelefone", formatarTelefone(e.target.value))}
                        placeholder="(00) 00000-0000"
                        className="mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── TIPO DE OPERAÇÃO + BANCO + CONVÊNIO ─── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Tipo de Operação *</label>
                  <select value={npForm.tipoOperacao} onChange={e => updateNp("tipoOperacao", e.target.value)}
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm">
                    <option value="EMPRESTIMO_CONSIGNADO">Novo</option>
                    <option value="PORTABILIDADE">Portabilidade</option>
                    <option value="REFINANCIAMENTO">Refinanciamento</option>
                    <option value="PORTABILIDADE_REFIN">Port + Refin</option>
                    <option value="CARTAO_CONSIGNADO">Cartão Consignado</option>
                    <option value="CARTAO_BENEFICIO">Cartão Benefício</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Banco Destino</label>
                  <select value={npForm.bancoNome} onChange={e => updateNp("bancoNome", e.target.value)}
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm">
                    <option value="">Selecione...</option>
                    {npBancos.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Convênio</label>
                  <select value={npForm.convenioNome} onChange={e => updateNp("convenioNome", e.target.value)}
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm">
                    <option value="">Selecione...</option>
                    {npConvenios.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Banco Origem {npForm.tipoOperacao.includes("PORT") ? "(Port)" : ""}</label>
                  <select value={npForm.bancoOrigem} onChange={e => updateNp("bancoOrigem", e.target.value)}
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm">
                    <option value="">Selecione...</option>
                    {npBancos.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* ─── VALORES ─── */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Valor Liberado</label>
                  <input type="number" step="0.01" value={npForm.valorLiberado} onChange={e => updateNp("valorLiberado", e.target.value)}
                    placeholder="5000.00"
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Parcela</label>
                  <input type="number" step="0.01" value={npForm.valorParcela} onChange={e => updateNp("valorParcela", e.target.value)}
                    placeholder="150.00"
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Prazo (meses)</label>
                  <input type="number" value={npForm.prazo} onChange={e => updateNp("prazo", e.target.value)}
                    placeholder="84"
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Taxa (%)</label>
                  <input type="number" step="0.01" value={npForm.taxaJuros} onChange={e => updateNp("taxaJuros", e.target.value)}
                    placeholder="1.80"
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-500 uppercase">Saldo Devedor</label>
                  <input type="number" step="0.01" value={npForm.saldoDevedor} onChange={e => updateNp("saldoDevedor", e.target.value)}
                    placeholder="25000.00"
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm" />
                </div>
              </div>

              {/* ─── OBSERVAÇÕES ─── */}
              <div>
                <label className="text-xs font-semibold text-zinc-500 uppercase">Observações</label>
                <textarea value={npForm.observacoes} onChange={e => updateNp("observacoes", e.target.value)}
                  placeholder="Anotações..."
                  rows={3}
                  className="mt-1 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition text-sm resize-none" />
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3 shrink-0">
              <button onClick={() => setNovaPropostaModal(false)} className="px-4 py-2 font-semibold text-zinc-600 hover:text-zinc-900 transition">Cancelar</button>
              <button
                onClick={salvarNovaProposta}
                disabled={novaPropostaSaving || !npForm.clienteNome}
                className="px-6 py-2.5 bg-orange-600 text-white font-semibold rounded-xl hover:bg-orange-700 transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-orange-500/25"
              >
                {novaPropostaSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
                Cadastrar e Abrir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
