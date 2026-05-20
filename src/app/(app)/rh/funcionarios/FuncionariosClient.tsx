"use client";
import { useState, useMemo } from "react";
import {
  UserCheck, Plus, X, Search, Shield, AlertTriangle, Building2,
  User, Phone, Mail, MapPin, FileText, Briefcase, Clock, DollarSign,
  ChevronDown, Eye, Pencil, Trash2, GraduationCap, AlertCircle,
  CheckCircle2, XCircle, TrendingUp
} from "lucide-react";
import { calcularPassivoTrabalhista, formatarMoeda, calcularCustoTotalEmpresa } from "@/lib/rh/calculos-trabalhistas";

type Funcionario = {
  id: string;
  nome: string;
  cpf: string;
  rg?: string | null;
  dataNascimento?: string | null;
  telefone?: string | null;
  email?: string | null;
  fotoUrl?: string | null;
  genero?: string | null;
  estadoCivil?: string | null;
  escolaridade?: string | null;
  nomeMae?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
  regimeContratacao: string;
  ctpsNumero?: string | null;
  ctpsSerie?: string | null;
  pisPasep?: string | null;
  dataAdmissao?: string | null;
  dataDemissao?: string | null;
  cargoFuncao?: string | null;
  cbo?: string | null;
  tipoJornada: string;
  horasDiarias: number;
  horasSemanais: number;
  salarioBase?: number | null;
  valeTransporte: boolean;
  valeAlimentacao?: number | null;
  planoSaude: boolean;
  tipoComissao?: string | null;
  percentualComissao?: number | null;
  cnpjPj?: string | null;
  razaoSocialPj?: string | null;
  valorMensalPj?: number | null;
  sindicatoNome?: string | null;
  cctVigente?: string | null;
  pisoSalarialCct?: number | null;
  instituicaoEnsino?: string | null;
  cursoEstagio?: string | null;
  bolsaAuxilio?: number | null;
  dataFimEstagio?: string | null;
  bancoNome?: string | null;
  bancoAgencia?: string | null;
  bancoConta?: string | null;
  bancoTipoConta?: string | null;
  chavePix?: string | null;
  status: string;
  nivelRisco: string;
  passivoEstimado: number;
  observacoes?: string | null;
  createdAt: string;
};

const REGIME_LABELS: Record<string, string> = {
  CLT: "CLT",
  PJ: "Pessoa Jurídica",
  ESTAGIARIO: "Estagiário",
  INFORMAL: "Informal",
};

const REGIME_COLORS: Record<string, string> = {
  CLT: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
  PJ: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  ESTAGIARIO: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  INFORMAL: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  FERIAS: "Férias",
  AFASTADO: "Afastado",
  DESLIGADO: "Desligado",
};

const RISCO_CONFIG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  BAIXO: { color: "text-emerald-500", icon: <CheckCircle2 className="h-4 w-4" />, label: "Baixo" },
  MEDIO: { color: "text-amber-500", icon: <AlertCircle className="h-4 w-4" />, label: "Médio" },
  ALTO: { color: "text-orange-500", icon: <AlertTriangle className="h-4 w-4" />, label: "Alto" },
  EXTREMO: { color: "text-red-500", icon: <XCircle className="h-4 w-4" />, label: "Extremo" },
};

const JORNADA_OPTIONS = [
  { value: "PADRAO_8H", label: "Padrão 8h/dia (44h/sem)", horas: 8, semanais: 44 },
  { value: "TELEMARKETING_6H", label: "Telemarketing 6h/dia (36h/sem)", horas: 6, semanais: 36 },
  { value: "ESTAGIO_6H", label: "Estágio 6h/dia (30h/sem)", horas: 6, semanais: 30 },
];

const EMPTY_FORM = {
  nome: "", cpf: "", rg: "", dataNascimento: "", telefone: "", email: "",
  genero: "", estadoCivil: "", escolaridade: "", nomeMae: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
  regimeContratacao: "CLT",
  ctpsNumero: "", ctpsSerie: "", pisPasep: "", dataAdmissao: "", dataDemissao: "",
  cargoFuncao: "", cbo: "", tipoJornada: "PADRAO_8H", horasDiarias: 8, horasSemanais: 44,
  salarioBase: "", valeTransporte: false, valeAlimentacao: "", planoSaude: false,
  tipoComissao: "", percentualComissao: "",
  cnpjPj: "", razaoSocialPj: "", valorMensalPj: "",
  sindicatoNome: "", cctVigente: "", pisoSalarialCct: "",
  instituicaoEnsino: "", cursoEstagio: "", bolsaAuxilio: "", dataFimEstagio: "",
  bancoNome: "", bancoAgencia: "", bancoConta: "", bancoTipoConta: "", chavePix: "",
  observacoes: "",
};

export function FuncionariosClient({
  funcionarios: initialFuncionarios,
  empresaId,
  regimeTributario,
}: {
  funcionarios: Funcionario[];
  empresaId: string;
  regimeTributario: string;
}) {
  const [funcionarios, setFuncionarios] = useState(initialFuncionarios);
  const [filtro, setFiltro] = useState("");
  const [filtroRegime, setFiltroRegime] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("ATIVO");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [abaAtiva, setAbaAtiva] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [detalhe, setDetalhe] = useState<Funcionario | null>(null);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const ativos = funcionarios.filter(f => f.status === "ATIVO");
    return {
      total: ativos.length,
      clt: ativos.filter(f => f.regimeContratacao === "CLT").length,
      pj: ativos.filter(f => f.regimeContratacao === "PJ").length,
      estagiario: ativos.filter(f => f.regimeContratacao === "ESTAGIARIO").length,
      informal: ativos.filter(f => f.regimeContratacao === "INFORMAL").length,
      passivoTotal: ativos.reduce((acc, f) => acc + (f.passivoEstimado || 0), 0),
      riscoCritico: ativos.filter(f => f.nivelRisco === "ALTO" || f.nivelRisco === "EXTREMO").length,
    };
  }, [funcionarios]);

  // ── Filtros ──
  const filtrados = useMemo(() => {
    return funcionarios.filter(f => {
      if (filtroStatus !== "todos" && f.status !== filtroStatus) return false;
      if (filtroRegime !== "todos" && f.regimeContratacao !== filtroRegime) return false;
      if (filtro) {
        const q = filtro.toLowerCase();
        return f.nome.toLowerCase().includes(q) || f.cpf.includes(q) || (f.cargoFuncao || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [funcionarios, filtro, filtroRegime, filtroStatus]);

  // ── Handlers ──
  function abrirNovo() {
    setEditando(null);
    setForm(EMPTY_FORM);
    setAbaAtiva(0);
    setModal(true);
  }

  function abrirEditar(func: Funcionario) {
    setEditando(func);
    setForm({
      nome: func.nome, cpf: func.cpf, rg: func.rg || "", dataNascimento: func.dataNascimento?.split("T")[0] || "",
      telefone: func.telefone || "", email: func.email || "", genero: func.genero || "",
      estadoCivil: func.estadoCivil || "", escolaridade: func.escolaridade || "", nomeMae: func.nomeMae || "",
      cep: func.cep || "", logradouro: func.logradouro || "", numero: func.numero || "",
      complemento: func.complemento || "", bairro: func.bairro || "", cidade: func.cidade || "", uf: func.uf || "",
      regimeContratacao: func.regimeContratacao,
      ctpsNumero: func.ctpsNumero || "", ctpsSerie: func.ctpsSerie || "", pisPasep: func.pisPasep || "",
      dataAdmissao: func.dataAdmissao?.split("T")[0] || "", dataDemissao: func.dataDemissao?.split("T")[0] || "",
      cargoFuncao: func.cargoFuncao || "", cbo: func.cbo || "", tipoJornada: func.tipoJornada,
      horasDiarias: func.horasDiarias, horasSemanais: func.horasSemanais,
      salarioBase: func.salarioBase?.toString() || "", valeTransporte: func.valeTransporte,
      valeAlimentacao: func.valeAlimentacao?.toString() || "", planoSaude: func.planoSaude,
      tipoComissao: func.tipoComissao || "", percentualComissao: func.percentualComissao?.toString() || "",
      cnpjPj: func.cnpjPj || "", razaoSocialPj: func.razaoSocialPj || "", valorMensalPj: func.valorMensalPj?.toString() || "",
      sindicatoNome: func.sindicatoNome || "", cctVigente: func.cctVigente || "", pisoSalarialCct: func.pisoSalarialCct?.toString() || "",
      instituicaoEnsino: func.instituicaoEnsino || "", cursoEstagio: func.cursoEstagio || "",
      bolsaAuxilio: func.bolsaAuxilio?.toString() || "", dataFimEstagio: func.dataFimEstagio?.split("T")[0] || "",
      bancoNome: func.bancoNome || "", bancoAgencia: func.bancoAgencia || "", bancoConta: func.bancoConta || "",
      bancoTipoConta: func.bancoTipoConta || "", chavePix: func.chavePix || "",
      observacoes: func.observacoes || "",
    });
    setAbaAtiva(0);
    setModal(true);
  }

  function fecharModal() {
    setModal(false);
    setEditando(null);
    setForm(EMPTY_FORM);
  }

  function onJornadaChange(tipoJornada: string) {
    const j = JORNADA_OPTIONS.find(o => o.value === tipoJornada);
    setForm(prev => ({
      ...prev,
      tipoJornada,
      horasDiarias: j?.horas || 8,
      horasSemanais: j?.semanais || 44,
    }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      const salario = parseFloat(form.salarioBase) || 0;
      const meses = form.dataAdmissao
        ? Math.max(1, Math.round((Date.now() - new Date(form.dataAdmissao).getTime()) / (1000 * 60 * 60 * 24 * 30)))
        : 1;

      const passivo = calcularPassivoTrabalhista({
        salarioBase: salario || parseFloat(form.valorMensalPj) || parseFloat(form.bolsaAuxilio) || 1500,
        mesesTrabalhados: meses,
        regimeContratacao: form.regimeContratacao,
        tipoJornada: form.tipoJornada,
        horasDiarias: form.horasDiarias,
        regimeTributario,
      });

      const body = {
        ...form,
        salarioBase: parseFloat(form.salarioBase) || null,
        valeAlimentacao: parseFloat(form.valeAlimentacao) || null,
        percentualComissao: parseFloat(form.percentualComissao) || null,
        valorMensalPj: parseFloat(form.valorMensalPj) || null,
        pisoSalarialCct: parseFloat(form.pisoSalarialCct) || null,
        bolsaAuxilio: parseFloat(form.bolsaAuxilio) || null,
        dataNascimento: form.dataNascimento || null,
        dataAdmissao: form.dataAdmissao || null,
        dataDemissao: form.dataDemissao || null,
        dataFimEstagio: form.dataFimEstagio || null,
        nivelRisco: passivo.nivelRisco,
        passivoEstimado: passivo.passivoTotal,
      };

      const url = editando
        ? `/api/rh/funcionarios/${editando.id}`
        : "/api/rh/funcionarios";

      const res = await fetch(url, {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao salvar");
        return;
      }

      const saved = await res.json();

      if (editando) {
        setFuncionarios(prev => prev.map(f => f.id === saved.id ? saved : f));
      } else {
        setFuncionarios(prev => [saved, ...prev]);
      }

      fecharModal();
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(id: string) {
    if (!confirm("Deseja realmente excluir este funcionário?")) return;
    const res = await fetch(`/api/rh/funcionarios/${id}`, { method: "DELETE" });
    if (res.ok) {
      setFuncionarios(prev => prev.filter(f => f.id !== id));
    }
  }

  const inputCls = "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition";

  const ABAS = ["Dados Pessoais", "Contrato & Jornada", "Remuneração", "Sindicato", "Dados Bancários"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand mb-1">👥 RH & COMPLIANCE</p>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Funcionários</h1>
          <p className="text-sm text-zinc-500 mt-1">Cadastre e gerencie seus colaboradores. Controle regimes, riscos e passivos trabalhistas.</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <KpiCard label="Total Ativos" value={kpis.total} color="bg-zinc-100 dark:bg-zinc-800" />
          <KpiCard label="CLT" value={kpis.clt} color="bg-emerald-50 dark:bg-emerald-950/30" />
          <KpiCard label="PJ" value={kpis.pj} color="bg-amber-50 dark:bg-amber-950/30" />
          <KpiCard label="Estagiários" value={kpis.estagiario} color="bg-blue-50 dark:bg-blue-950/30" />
          <KpiCard label="Informais" value={kpis.informal} color="bg-red-50 dark:bg-red-950/30" icon={kpis.informal > 0 ? <AlertTriangle className="h-4 w-4 text-red-500" /> : undefined} />
          <KpiCard label="Passivo Total" value={formatarMoeda(kpis.passivoTotal)} color={kpis.passivoTotal > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-emerald-50 dark:bg-emerald-950/30"} small />
          <KpiCard label="Risco Crítico" value={kpis.riscoCritico} color={kpis.riscoCritico > 0 ? "bg-red-50 dark:bg-red-950/30" : "bg-emerald-50 dark:bg-emerald-950/30"} icon={kpis.riscoCritico > 0 ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />} />
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nome, CPF ou cargo..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
            {["todos", "CLT", "PJ", "ESTAGIARIO", "INFORMAL"].map(r => (
              <button
                key={r}
                onClick={() => setFiltroRegime(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${filtroRegime === r ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700"}`}
              >
                {r === "todos" ? "Todos" : REGIME_LABELS[r] || r}
              </button>
            ))}
          </div>
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-medium"
          >
            <option value="todos">Todos Status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button
            onClick={abrirNovo}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-90 transition ml-auto"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            <Plus className="h-4 w-4" /> Novo Funcionário
          </button>
        </div>

        {/* Lista */}
        {filtrados.length === 0 ? (
          <div className="text-center py-20">
            <UserCheck className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
            <p className="text-zinc-500 font-medium">Nenhum funcionário encontrado</p>
            <p className="text-sm text-zinc-400 mt-1">Clique em &quot;Novo Funcionário&quot; para cadastrar</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            <div className="hidden lg:grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_0.8fr_auto] gap-4 px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              <span>Funcionário</span>
              <span>Cargo / Função</span>
              <span>Regime</span>
              <span>Salário / Valor</span>
              <span>Passivo Estimado</span>
              <span>Risco</span>
              <span className="text-right">Ações</span>
            </div>
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtrados.map(func => {
                const risco = RISCO_CONFIG[func.nivelRisco] || RISCO_CONFIG.BAIXO;
                return (
                  <div
                    key={func.id}
                    className="group grid grid-cols-1 lg:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_0.8fr_auto] gap-3 lg:gap-4 items-center px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer"
                    onClick={() => setDetalhe(func)}
                  >
                    {/* Nome */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold text-sm shrink-0">
                        {func.nome.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{func.nome}</p>
                        <p className="text-xs text-zinc-400 truncate">{func.cpf} {func.telefone ? `• ${func.telefone}` : ""}</p>
                      </div>
                    </div>

                    {/* Cargo */}
                    <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                      {func.cargoFuncao || "—"}
                    </div>

                    {/* Regime */}
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${REGIME_COLORS[func.regimeContratacao] || "bg-zinc-100 text-zinc-600"}`}>
                        {REGIME_LABELS[func.regimeContratacao] || func.regimeContratacao}
                      </span>
                    </div>

                    {/* Salário */}
                    <div className="text-sm font-medium tabular-nums">
                      {func.regimeContratacao === "PJ"
                        ? formatarMoeda(func.valorMensalPj || 0)
                        : func.regimeContratacao === "ESTAGIARIO"
                          ? formatarMoeda(func.bolsaAuxilio || 0)
                          : formatarMoeda(func.salarioBase || 0)
                      }
                    </div>

                    {/* Passivo */}
                    <div className={`text-sm font-semibold tabular-nums ${func.passivoEstimado > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {func.passivoEstimado > 0 ? formatarMoeda(func.passivoEstimado) : "R$ 0,00"}
                    </div>

                    {/* Risco */}
                    <div className={`flex items-center gap-1.5 ${risco.color}`}>
                      {risco.icon}
                      <span className="text-xs font-semibold">{risco.label}</span>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => abrirEditar(func)}
                        className="flex items-center justify-center h-8 w-8 rounded-lg text-zinc-400 hover:text-brand hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => excluir(func.id)}
                        className="flex items-center justify-center h-8 w-8 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalhe */}
      {detalhe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setDetalhe(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 font-bold">
                  {detalhe.nome.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{detalhe.nome}</h2>
                  <p className="text-sm text-zinc-500">{detalhe.cargoFuncao || "Sem cargo definido"} • {REGIME_LABELS[detalhe.regimeContratacao]}</p>
                </div>
              </div>
              <button onClick={() => setDetalhe(null)} className="text-zinc-400 hover:text-zinc-600 transition"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* Alertas de risco */}
              {detalhe.nivelRisco !== "BAIXO" && (
                <div className={`rounded-xl p-4 ${detalhe.nivelRisco === "EXTREMO" ? "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800" : "bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`h-5 w-5 ${detalhe.nivelRisco === "EXTREMO" ? "text-red-500" : "text-amber-500"}`} />
                    <span className="font-semibold text-sm">Risco {RISCO_CONFIG[detalhe.nivelRisco]?.label} — Passivo Estimado: {formatarMoeda(detalhe.passivoEstimado)}</span>
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {detalhe.regimeContratacao === "INFORMAL" && "Este funcionário atua na informalidade. Multa por falta de registro: R$ 3.000,00 por funcionário (Art. 47 CLT). Regularize imediatamente."}
                    {detalhe.regimeContratacao === "PJ" && "Contratação PJ pode configurar pejotização fraudulenta se houver subordinação, pessoalidade e habitualidade. Risco de reconhecimento de vínculo CLT retroativo."}
                    {detalhe.regimeContratacao === "CLT" && detalhe.nivelRisco !== "BAIXO" && "Verifique se a jornada e o enquadramento sindical estão corretos para evitar passivos trabalhistas."}
                  </p>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoItem icon={<User className="h-4 w-4" />} label="CPF" value={detalhe.cpf} />
                <InfoItem icon={<Phone className="h-4 w-4" />} label="Telefone" value={detalhe.telefone || "—"} />
                <InfoItem icon={<Mail className="h-4 w-4" />} label="E-mail" value={detalhe.email || "—"} />
                <InfoItem icon={<MapPin className="h-4 w-4" />} label="Cidade/UF" value={`${detalhe.cidade || "—"}/${detalhe.uf || "—"}`} />
                <InfoItem icon={<Briefcase className="h-4 w-4" />} label="CBO" value={detalhe.cbo || "—"} />
                <InfoItem icon={<Clock className="h-4 w-4" />} label="Jornada" value={`${detalhe.horasDiarias}h/dia • ${detalhe.horasSemanais}h/sem`} />
                <InfoItem icon={<DollarSign className="h-4 w-4" />} label="Salário/Valor" value={formatarMoeda(detalhe.salarioBase || detalhe.valorMensalPj || detalhe.bolsaAuxilio || 0)} />
                <InfoItem icon={<FileText className="h-4 w-4" />} label="Admissão" value={detalhe.dataAdmissao ? new Date(detalhe.dataAdmissao).toLocaleDateString("pt-BR") : "—"} />
              </div>

              {/* Ações */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setDetalhe(null); abrirEditar(detalhe); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand/10 text-brand text-sm font-medium hover:bg-brand/20 transition" style={{ color: "var(--brand-primary)" }}>
                  <Pencil className="h-4 w-4" /> Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-brand" style={{ color: "var(--brand-primary)" }} />
                {editando ? "Editar Funcionário" : "Novo Funcionário"}
              </h2>
              <button onClick={fecharModal} className="text-zinc-400 hover:text-zinc-600 transition"><X className="h-5 w-5" /></button>
            </div>

            {/* Regime selector */}
            <div className="px-6 pt-6">
              <label className="text-sm font-medium mb-2 block">Regime de Contratação *</label>
              <div className="grid grid-cols-4 gap-2">
                {(["CLT", "PJ", "ESTAGIARIO", "INFORMAL"] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => {
                      setForm(prev => ({
                        ...prev,
                        regimeContratacao: r,
                        tipoJornada: r === "ESTAGIARIO" ? "ESTAGIO_6H" : r === "CLT" ? "PADRAO_8H" : prev.tipoJornada,
                        horasDiarias: r === "ESTAGIARIO" ? 6 : r === "CLT" ? 8 : prev.horasDiarias,
                        horasSemanais: r === "ESTAGIARIO" ? 30 : r === "CLT" ? 44 : prev.horasSemanais,
                      }));
                    }}
                    className={`py-3 rounded-xl text-sm font-medium border transition text-center ${form.regimeContratacao === r
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
                      }`}
                    style={form.regimeContratacao === r ? { borderColor: "var(--brand-primary)", color: "var(--brand-primary)", backgroundColor: "color-mix(in srgb, var(--brand-primary) 10%, transparent)" } : {}}
                  >
                    {REGIME_LABELS[r]}
                  </button>
                ))}
              </div>
              {form.regimeContratacao === "INFORMAL" && (
                <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span><strong>RISCO EXTREMO:</strong> Manter funcionário sem registro sujeita a multa de R$ 3.000 por trabalhador (Art. 47 CLT) e reconhecimento de vínculo retroativo.</span>
                </div>
              )}
              {form.regimeContratacao === "PJ" && (
                <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span><strong>ATENÇÃO:</strong> Controle de horário, subordinação direta e pessoalidade configuram vínculo CLT disfarçado (pejotização). O KROMUZ desabilitará monitoramento de ponto para PJ.</span>
                </div>
              )}
            </div>

            {/* Abas */}
            <div className="px-6 pt-4">
              <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
                {ABAS.map((aba, i) => (
                  <button
                    key={aba}
                    onClick={() => setAbaAtiva(i)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${abaAtiva === i
                      ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-700"
                      }`}
                  >
                    {aba}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Aba 0: Dados Pessoais */}
              {abaAtiva === 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-1">
                      <label className="text-sm font-medium">Nome Completo *</label>
                      <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} className={inputCls} placeholder="Nome completo" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">CPF *</label>
                      <input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: e.target.value }))} className={inputCls} placeholder="000.000.000-00" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">RG</label>
                      <input value={form.rg} onChange={e => setForm(p => ({ ...p, rg: e.target.value }))} className={inputCls} placeholder="RG" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Data de Nascimento</label>
                      <input type="date" value={form.dataNascimento} onChange={e => setForm(p => ({ ...p, dataNascimento: e.target.value }))} className={inputCls} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Telefone</label>
                      <input value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} className={inputCls} placeholder="(00) 00000-0000" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">E-mail</label>
                      <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} placeholder="email@exemplo.com" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Gênero</label>
                      <select value={form.genero} onChange={e => setForm(p => ({ ...p, genero: e.target.value }))} className={inputCls}>
                        <option value="">Selecione</option>
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">CEP</label>
                      <input value={form.cep} onChange={e => setForm(p => ({ ...p, cep: e.target.value }))} className={inputCls} placeholder="00000-000" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-sm font-medium">Logradouro</label>
                      <input value={form.logradouro} onChange={e => setForm(p => ({ ...p, logradouro: e.target.value }))} className={inputCls} />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-1"><label className="text-sm font-medium">Número</label><input value={form.numero} onChange={e => setForm(p => ({ ...p, numero: e.target.value }))} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">Bairro</label><input value={form.bairro} onChange={e => setForm(p => ({ ...p, bairro: e.target.value }))} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">Cidade</label><input value={form.cidade} onChange={e => setForm(p => ({ ...p, cidade: e.target.value }))} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">UF</label><input value={form.uf} onChange={e => setForm(p => ({ ...p, uf: e.target.value }))} className={inputCls} maxLength={2} /></div>
                  </div>
                </div>
              )}

              {/* Aba 1: Contrato & Jornada */}
              {abaAtiva === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Cargo / Função *</label>
                      <input value={form.cargoFuncao} onChange={e => setForm(p => ({ ...p, cargoFuncao: e.target.value }))} className={inputCls} placeholder="Ex: Promotor de Vendas" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">CBO</label>
                      <input value={form.cbo} onChange={e => setForm(p => ({ ...p, cbo: e.target.value }))} className={inputCls} placeholder="Ex: 4212-10" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Tipo de Jornada *</label>
                    <div className="grid grid-cols-3 gap-2">
                      {JORNADA_OPTIONS.map(j => (
                        <button
                          key={j.value}
                          onClick={() => onJornadaChange(j.value)}
                          className={`py-3 rounded-xl text-xs font-medium border transition text-center ${form.tipoJornada === j.value
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
                            }`}
                          style={form.tipoJornada === j.value ? { borderColor: "var(--brand-primary)", color: "var(--brand-primary)", backgroundColor: "color-mix(in srgb, var(--brand-primary) 10%, transparent)" } : {}}
                        >
                          {j.label}
                        </button>
                      ))}
                    </div>
                    {form.tipoJornada === "TELEMARKETING_6H" && (
                      <div className="mt-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-400">
                        <strong>NR-17:</strong> Operadores de telemarketing têm direito a 2 pausas de 10min + 1 intervalo de 20min para refeição. O controle de ponto do KROMUZ monitorará automaticamente.
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Data de Admissão</label>
                      <input type="date" value={form.dataAdmissao} onChange={e => setForm(p => ({ ...p, dataAdmissao: e.target.value }))} className={inputCls} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Data de Demissão</label>
                      <input type="date" value={form.dataDemissao} onChange={e => setForm(p => ({ ...p, dataDemissao: e.target.value }))} className={inputCls} />
                    </div>
                  </div>
                  {form.regimeContratacao === "CLT" && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1"><label className="text-sm font-medium">CTPS Número</label><input value={form.ctpsNumero} onChange={e => setForm(p => ({ ...p, ctpsNumero: e.target.value }))} className={inputCls} /></div>
                      <div className="space-y-1"><label className="text-sm font-medium">CTPS Série</label><input value={form.ctpsSerie} onChange={e => setForm(p => ({ ...p, ctpsSerie: e.target.value }))} className={inputCls} /></div>
                      <div className="space-y-1"><label className="text-sm font-medium">PIS/PASEP</label><input value={form.pisPasep} onChange={e => setForm(p => ({ ...p, pisPasep: e.target.value }))} className={inputCls} /></div>
                    </div>
                  )}
                  {form.regimeContratacao === "PJ" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-sm font-medium">CNPJ PJ</label><input value={form.cnpjPj} onChange={e => setForm(p => ({ ...p, cnpjPj: e.target.value }))} className={inputCls} placeholder="00.000.000/0000-00" /></div>
                      <div className="space-y-1"><label className="text-sm font-medium">Razão Social</label><input value={form.razaoSocialPj} onChange={e => setForm(p => ({ ...p, razaoSocialPj: e.target.value }))} className={inputCls} /></div>
                    </div>
                  )}
                  {form.regimeContratacao === "ESTAGIARIO" && (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1"><label className="text-sm font-medium">Instituição de Ensino</label><input value={form.instituicaoEnsino} onChange={e => setForm(p => ({ ...p, instituicaoEnsino: e.target.value }))} className={inputCls} /></div>
                      <div className="space-y-1"><label className="text-sm font-medium">Curso</label><input value={form.cursoEstagio} onChange={e => setForm(p => ({ ...p, cursoEstagio: e.target.value }))} className={inputCls} /></div>
                      <div className="space-y-1"><label className="text-sm font-medium">Fim do Estágio</label><input type="date" value={form.dataFimEstagio} onChange={e => setForm(p => ({ ...p, dataFimEstagio: e.target.value }))} className={inputCls} /></div>
                    </div>
                  )}
                </div>
              )}

              {/* Aba 2: Remuneração */}
              {abaAtiva === 2 && (
                <div className="space-y-4">
                  {form.regimeContratacao === "CLT" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Salário Base (R$) *</label>
                          <input type="number" step="0.01" value={form.salarioBase} onChange={e => setForm(p => ({ ...p, salarioBase: e.target.value }))} className={inputCls} placeholder="0.00" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Vale Alimentação (R$)</label>
                          <input type="number" step="0.01" value={form.valeAlimentacao} onChange={e => setForm(p => ({ ...p, valeAlimentacao: e.target.value }))} className={inputCls} placeholder="0.00" />
                        </div>
                      </div>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={form.valeTransporte} onChange={e => setForm(p => ({ ...p, valeTransporte: e.target.checked }))} className="rounded" />
                          Vale Transporte (desconto 6%)
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={form.planoSaude} onChange={e => setForm(p => ({ ...p, planoSaude: e.target.checked }))} className="rounded" />
                          Plano de Saúde
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium">Tipo de Comissão</label>
                          <select value={form.tipoComissao} onChange={e => setForm(p => ({ ...p, tipoComissao: e.target.value }))} className={inputCls}>
                            <option value="">Sem comissão</option>
                            <option value="PERCENTUAL">Percentual</option>
                            <option value="FIXO">Valor Fixo</option>
                          </select>
                        </div>
                        {form.tipoComissao === "PERCENTUAL" && (
                          <div className="space-y-1">
                            <label className="text-sm font-medium">Percentual (%)</label>
                            <input type="number" step="0.01" value={form.percentualComissao} onChange={e => setForm(p => ({ ...p, percentualComissao: e.target.value }))} className={inputCls} placeholder="0.00" />
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {form.regimeContratacao === "PJ" && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Valor Mensal PJ (R$) *</label>
                      <input type="number" step="0.01" value={form.valorMensalPj} onChange={e => setForm(p => ({ ...p, valorMensalPj: e.target.value }))} className={inputCls} placeholder="0.00" />
                    </div>
                  )}
                  {form.regimeContratacao === "ESTAGIARIO" && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Bolsa Auxílio (R$)</label>
                      <input type="number" step="0.01" value={form.bolsaAuxilio} onChange={e => setForm(p => ({ ...p, bolsaAuxilio: e.target.value }))} className={inputCls} placeholder="0.00" />
                    </div>
                  )}
                  {form.regimeContratacao === "INFORMAL" && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Valor Pago Mensalmente (R$)</label>
                      <input type="number" step="0.01" value={form.salarioBase} onChange={e => setForm(p => ({ ...p, salarioBase: e.target.value }))} className={inputCls} placeholder="0.00" />
                      <p className="text-xs text-red-500 mt-1">Este valor será usado para calcular o passivo trabalhista estimado.</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-500">Observações</label>
                    <textarea rows={2} value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} className={inputCls} placeholder="Notas adicionais..." />
                  </div>
                </div>
              )}

              {/* Aba 3: Sindicato */}
              {abaAtiva === 3 && (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Sindicato</label>
                    <input value={form.sindicatoNome} onChange={e => setForm(p => ({ ...p, sindicatoNome: e.target.value }))} className={inputCls} placeholder="Ex: SEAAC - Sindicato dos Empregados em Assessoria" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">CCT Vigente</label>
                      <input value={form.cctVigente} onChange={e => setForm(p => ({ ...p, cctVigente: e.target.value }))} className={inputCls} placeholder="Ex: CCT 2024/2026" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Piso Salarial (R$)</label>
                      <input type="number" step="0.01" value={form.pisoSalarialCct} onChange={e => setForm(p => ({ ...p, pisoSalarialCct: e.target.value }))} className={inputCls} placeholder="0.00" />
                    </div>
                  </div>
                  {form.pisoSalarialCct && form.salarioBase && parseFloat(form.salarioBase) < parseFloat(form.pisoSalarialCct) && (
                    <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span><strong>ALERTA:</strong> O salário base (R$ {form.salarioBase}) está abaixo do piso da CCT (R$ {form.pisoSalarialCct}). Correção mandatória para evitar multas.</span>
                    </div>
                  )}
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-700 dark:text-blue-400">
                    <strong>Dica:</strong> Correspondentes bancários geralmente se enquadram em sindicatos de serviços/assessoria (SEAAC, SESCON) e não no sindicato dos bancários (exceto se houver equiparação funcional).
                  </div>
                </div>
              )}

              {/* Aba 4: Dados Bancários */}
              {abaAtiva === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1"><label className="text-sm font-medium">Banco</label><input value={form.bancoNome} onChange={e => setForm(p => ({ ...p, bancoNome: e.target.value }))} className={inputCls} placeholder="Ex: Banco do Brasil" /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">Agência</label><input value={form.bancoAgencia} onChange={e => setForm(p => ({ ...p, bancoAgencia: e.target.value }))} className={inputCls} /></div>
                    <div className="space-y-1"><label className="text-sm font-medium">Conta</label><input value={form.bancoConta} onChange={e => setForm(p => ({ ...p, bancoConta: e.target.value }))} className={inputCls} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Tipo de Conta</label>
                      <select value={form.bancoTipoConta} onChange={e => setForm(p => ({ ...p, bancoTipoConta: e.target.value }))} className={inputCls}>
                        <option value="">Selecione</option>
                        <option value="corrente">Corrente</option>
                        <option value="poupanca">Poupança</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Chave PIX</label>
                      <input value={form.chavePix} onChange={e => setForm(p => ({ ...p, chavePix: e.target.value }))} className={inputCls} placeholder="CPF, e-mail, telefone ou chave aleatória" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={fecharModal} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition">Cancelar</button>
              <div className="flex gap-2">
                {abaAtiva > 0 && (
                  <button onClick={() => setAbaAtiva(a => a - 1)} className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition">
                    Anterior
                  </button>
                )}
                {abaAtiva < ABAS.length - 1 ? (
                  <button onClick={() => setAbaAtiva(a => a + 1)} className="px-4 py-2 rounded-xl bg-brand text-white text-sm font-semibold hover:opacity-90 transition" style={{ backgroundColor: "var(--brand-primary)" }}>
                    Próximo
                  </button>
                ) : (
                  <button
                    onClick={salvar}
                    disabled={!form.nome || !form.cpf || salvando}
                    className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-90 disabled:opacity-50 transition"
                    style={{ backgroundColor: "var(--brand-primary)" }}
                  >
                    <UserCheck className="h-4 w-4" /> {salvando ? "Salvando..." : editando ? "Salvar" : "Cadastrar"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color, icon, small }: { label: string; value: string | number; color: string; icon?: React.ReactNode; small?: boolean }) {
  return (
    <div className={`rounded-xl ${color} p-4 text-center`}>
      {icon && <div className="flex justify-center mb-1">{icon}</div>}
      <p className={`font-bold tabular-nums ${small ? "text-sm" : "text-2xl"}`}>{value}</p>
      <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-zinc-400 shrink-0">{icon}</div>
      <div>
        <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}
