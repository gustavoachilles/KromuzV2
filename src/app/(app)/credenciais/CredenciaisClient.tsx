"use client";
import { useState } from "react";
import {
  KeyRound, ExternalLink, Plus, X, Loader2, Eye, EyeOff,
  Building2, Shield, Search, Copy, Check, Globe, User, Lock,
  Pencil, Users, LayoutGrid, List
} from "lucide-react";

type Banco = {
  id: string;
  nome: string;
  logoUrl: string | null;
  codigoCompe: string | null;
  permiteIntegracao: boolean;
  credenciaisApi: any;
};

type Credencial = {
  id: string;
  tipo: "banco" | "promotora" | "sistema";
  nome: string;
  bancoId?: string;
  urlLogin: string;
  usuario: string;
  senha: string;
  observacoes: string;
  funcionario: string;
};

// URLs de login conhecidos dos bancos
const BANCO_LOGIN_URLS: Record<string, string> = {
  "unno": "https://portal.unnoconsig.com.br",
  "icred": "https://agente.icred.app",
  "bmg": "https://www.bancobmg.com.br/correspondente",
  "safra": "https://correspondente.safra.com.br",
  "master": "https://correspondente.bancomaster.com.br",
  "pan": "https://correspondente.bancopan.com.br",
  "c6": "https://correspondente.c6bank.com.br",
  "daycoval": "https://correspondente.daycoval.com.br",
  "banrisul": "https://correspondente.banrisul.com.br",
  "itau": "https://correspondente.itau.com.br",
  "bradesco": "https://correspondente.bradesco.com.br",
  "cetelem": "https://correspondente.cetelem.com.br",
  "ole": "https://correspondente.oleconsignado.com.br",
  "mercantil": "https://correspondente.mercantildobrasil.com.br",
  "facta": "https://factafinanceira.com.br/portal",
  "vctex": "https://app.vctex.com.br",
};

function guessLoginUrl(bancoNome: string): string {
  const lower = bancoNome.toLowerCase();
  for (const [key, url] of Object.entries(BANCO_LOGIN_URLS)) {
    if (lower.includes(key)) return url;
  }
  return "";
}

const DEFAULT_FUNCIONARIOS = ["Gustavo", "Wandeyr", "Walckiria"];

export function CredenciaisClient({ bancos, empresaId }: { bancos: Banco[]; empresaId: string }) {
  // Carregar credenciais do localStorage (não vai para o banco por segurança)
  const [credenciais, setCredenciais] = useState<Credencial[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = JSON.parse(localStorage.getItem(`kromuz_creds_${empresaId}`) || "[]");
      // Migrate old credentials that don't have funcionario field
      return raw.map((c: any) => ({ ...c, funcionario: c.funcionario || "" }));
    } catch { return []; }
  });

  // Carregar lista de funcionários do localStorage
  const [funcionarios, setFuncionarios] = useState<string[]>(() => {
    if (typeof window === "undefined") return DEFAULT_FUNCIONARIOS;
    try {
      const stored = localStorage.getItem(`kromuz_creds_funcionarios_${empresaId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.length > 0 ? parsed : DEFAULT_FUNCIONARIOS;
      }
      return DEFAULT_FUNCIONARIOS;
    } catch { return DEFAULT_FUNCIONARIOS; }
  });

  const [funcionarioTab, setFuncionarioTab] = useState<string>("Todos");
  const [filtro, setFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<"todos" | "banco" | "promotora" | "sistema">("todos");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Credencial | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [senhasVisiveis, setSenhasVisiveis] = useState<Set<string>>(new Set());
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [novoFuncionarioInput, setNovoFuncionarioInput] = useState("");
  const [showAddFuncionario, setShowAddFuncionario] = useState(false);
  const [viewMode, setViewMode] = useState<"cards" | "lista">("cards");

  const [form, setForm] = useState<Omit<Credencial, "id">>({
    tipo: "banco",
    nome: "",
    bancoId: "",
    urlLogin: "",
    usuario: "",
    senha: "",
    observacoes: "",
    funcionario: "",
  });

  function salvarFuncionarios(novaLista: string[]) {
    setFuncionarios(novaLista);
    localStorage.setItem(`kromuz_creds_funcionarios_${empresaId}`, JSON.stringify(novaLista));
  }

  function adicionarFuncionario() {
    const nome = novoFuncionarioInput.trim();
    if (!nome) return;
    if (funcionarios.some(f => f.toLowerCase() === nome.toLowerCase())) {
      setNovoFuncionarioInput("");
      setShowAddFuncionario(false);
      return;
    }
    const novaLista = [...funcionarios, nome];
    salvarFuncionarios(novaLista);
    setNovoFuncionarioInput("");
    setShowAddFuncionario(false);
  }

  function salvar() {
    const novoId = editando?.id || crypto.randomUUID();
    const novaCred: Credencial = { ...form, id: novoId };

    let novas: Credencial[];
    if (editando) {
      novas = credenciais.map(c => c.id === editando.id ? novaCred : c);
    } else {
      novas = [...credenciais, novaCred];
    }

    setCredenciais(novas);
    localStorage.setItem(`kromuz_creds_${empresaId}`, JSON.stringify(novas));
    fecharModal();
  }

  function excluir(id: string) {
    if (!confirm("Excluir esta credencial?")) return;
    const novas = credenciais.filter(c => c.id !== id);
    setCredenciais(novas);
    localStorage.setItem(`kromuz_creds_${empresaId}`, JSON.stringify(novas));
  }

  function fecharModal() {
    setModal(false);
    setEditando(null);
    setForm({ tipo: "banco", nome: "", bancoId: "", urlLogin: "", usuario: "", senha: "", observacoes: "", funcionario: "" });
  }

  function abrirEditar(cred: Credencial) {
    setEditando(cred);
    setForm({
      tipo: cred.tipo,
      nome: cred.nome,
      bancoId: cred.bancoId || "",
      urlLogin: cred.urlLogin,
      usuario: cred.usuario,
      senha: cred.senha,
      observacoes: cred.observacoes,
      funcionario: cred.funcionario || "",
    });
    setModal(true);
  }

  function abrirNovo(tipo: "banco" | "promotora" | "sistema" = "banco") {
    setForm({
      tipo,
      nome: "",
      bancoId: "",
      urlLogin: "",
      usuario: "",
      senha: "",
      observacoes: "",
      funcionario: funcionarioTab !== "Todos" ? funcionarioTab : "",
    });
    setEditando(null);
    setModal(true);
  }

  function toggleSenha(id: string) {
    const next = new Set(senhasVisiveis);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSenhasVisiveis(next);
  }

  async function copiar(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  }

  // Quando seleciona um banco, preenche URL automaticamente
  function onBancoChange(bancoId: string) {
    const banco = bancos.find(b => b.id === bancoId);
    setForm(prev => ({
      ...prev,
      bancoId,
      nome: banco?.nome || prev.nome,
      urlLogin: banco ? guessLoginUrl(banco.nome) : prev.urlLogin,
    }));
  }

  // Filter by employee tab first, then by tipo and search
  const credenciaisByEmployee = funcionarioTab === "Todos"
    ? credenciais
    : credenciais.filter(c => c.funcionario === funcionarioTab);

  const filtrados = credenciaisByEmployee.filter(c => {
    if (tipoFiltro !== "todos" && c.tipo !== tipoFiltro) return false;
    if (filtro) {
      const q = filtro.toLowerCase();
      return c.nome.toLowerCase().includes(q) || c.usuario.toLowerCase().includes(q);
    }
    return true;
  });

  // KPIs based on the selected employee tab
  const kpiBase = credenciaisByEmployee;

  const tipoIcon = (tipo: string) => {
    switch (tipo) {
      case "banco": return <Building2 className="h-4 w-4" />;
      case "promotora": return <Shield className="h-4 w-4" />;
      case "sistema": return <Globe className="h-4 w-4" />;
      default: return <KeyRound className="h-4 w-4" />;
    }
  };

  const tipoColor = (tipo: string) => {
    switch (tipo) {
      case "banco": return "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400";
      case "promotora": return "bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400";
      case "sistema": return "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400";
      default: return "bg-zinc-100 text-zinc-600";
    }
  };

  const inputCls = "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 transition";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand mb-1">🔐 CREDENCIAIS & ACESSOS</p>
          <h1 className="text-3xl font-bold tracking-tight">Painel de Credenciais</h1>
          <p className="text-sm text-zinc-500 mt-1">Gerencie seus logins de bancos, promotoras e sistemas em um só lugar.</p>
        </div>

        {/* Funcionário Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl p-1 flex-wrap">
            <button
              onClick={() => setFuncionarioTab("Todos")}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition ${
                funcionarioTab === "Todos"
                  ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Todos
            </button>
            {funcionarios.map(f => (
              <button
                key={f}
                onClick={() => setFuncionarioTab(f)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition ${
                  funcionarioTab === f
                    ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                }`}
              >
                <User className="h-3.5 w-3.5" />
                {f}
              </button>
            ))}
          </div>

          {/* Add Funcionario */}
          {showAddFuncionario ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={novoFuncionarioInput}
                onChange={e => setNovoFuncionarioInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") adicionarFuncionario(); if (e.key === "Escape") { setShowAddFuncionario(false); setNovoFuncionarioInput(""); } }}
                placeholder="Nome do funcionário..."
                autoFocus
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand/50 w-40"
              />
              <button
                onClick={adicionarFuncionario}
                disabled={!novoFuncionarioInput.trim()}
                className="rounded-lg bg-brand px-2.5 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => { setShowAddFuncionario(false); setNovoFuncionarioInput(""); }}
                className="rounded-lg border border-zinc-300 dark:border-zinc-600 px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddFuncionario(true)}
              className="flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 px-3 py-2 text-xs text-zinc-500 hover:border-brand hover:text-brand transition"
              title="Adicionar funcionário"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total", count: kpiBase.length, color: "bg-zinc-100 dark:bg-zinc-800" },
            { label: "Bancos", count: kpiBase.filter(c => c.tipo === "banco").length, color: "bg-blue-50 dark:bg-blue-950/30" },
            { label: "Promotoras", count: kpiBase.filter(c => c.tipo === "promotora").length, color: "bg-purple-50 dark:bg-purple-950/30" },
            { label: "Sistemas", count: kpiBase.filter(c => c.tipo === "sistema").length, color: "bg-emerald-50 dark:bg-emerald-950/30" },
          ].map((k, i) => (
            <div key={i} className={`rounded-xl ${k.color} p-4 text-center`}>
              <p className="text-2xl font-bold tabular-nums">{k.count}</p>
              <p className="text-xs text-zinc-500 uppercase tracking-wider">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar credencial..."
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
            />
          </div>
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
            {(["todos", "banco", "promotora", "sistema"] as const).map(t => (
              <button
                key={t}
                onClick={() => setTipoFiltro(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${tipoFiltro === t ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700"}`}
              >
                {t === "todos" ? "Todos" : t.charAt(0).toUpperCase() + t.slice(1) + "s"}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode("cards")}
              className={`p-1.5 rounded-lg transition ${viewMode === "cards" ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600"}`}
              title="Visualizar em cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("lista")}
              className={`p-1.5 rounded-lg transition ${viewMode === "lista" ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600"}`}
              title="Visualizar em lista"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => abrirNovo()}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-90 transition"
          >
            <Plus className="h-4 w-4" /> Nova Credencial
          </button>
        </div>

        {/* Lista de credenciais */}
        {filtrados.length === 0 ? (
          <div className="text-center py-20">
            <KeyRound className="h-12 w-12 mx-auto mb-4 text-zinc-300" />
            <p className="text-zinc-500 font-medium">Nenhuma credencial cadastrada</p>
            <p className="text-sm text-zinc-400 mt-1">Clique em &quot;Nova Credencial&quot; para adicionar seus acessos</p>
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtrados.map(cred => (
              <div
                key={cred.id}
                className="group rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 hover:shadow-lg hover:border-brand/30 transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${tipoColor(cred.tipo)}`}>
                      {tipoIcon(cred.tipo)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{cred.nome}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${tipoColor(cred.tipo)}`}>
                          {cred.tipo}
                        </span>
                        {cred.funcionario && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                            <User className="h-2.5 w-2.5" />
                            {cred.funcionario}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => abrirEditar(cred)}
                    className="flex items-center justify-center h-8 w-8 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:text-brand hover:border-brand/50 transition"
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Campos */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="text-zinc-600 dark:text-zinc-400 truncate flex-1">{cred.usuario}</span>
                    <button
                      onClick={() => copiar(cred.usuario, `user-${cred.id}`)}
                      className="text-zinc-400 hover:text-brand transition shrink-0"
                      title="Copiar usuário"
                    >
                      {copiadoId === `user-${cred.id}` ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Lock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <span className="text-zinc-600 dark:text-zinc-400 truncate flex-1 font-mono">
                      {senhasVisiveis.has(cred.id) ? cred.senha : "••••••••"}
                    </span>
                    <button
                      onClick={() => toggleSenha(cred.id)}
                      className="text-zinc-400 hover:text-brand transition shrink-0"
                      title={senhasVisiveis.has(cred.id) ? "Ocultar" : "Mostrar"}
                    >
                      {senhasVisiveis.has(cred.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => copiar(cred.senha, `pw-${cred.id}`)}
                      className="text-zinc-400 hover:text-brand transition shrink-0"
                      title="Copiar senha"
                    >
                      {copiadoId === `pw-${cred.id}` ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {cred.observacoes && (
                    <p className="text-xs text-zinc-400 italic truncate">{cred.observacoes}</p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  {cred.urlLogin && (
                    <a
                      href={cred.urlLogin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 text-brand text-xs font-medium hover:bg-brand/20 transition"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> Acessar Login
                    </a>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={() => excluir(cred.id)}
                    className="text-xs text-red-400 hover:text-red-600 transition"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Visualização em Lista */
          <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
            {/* Header da tabela */}
            <div className="hidden md:grid grid-cols-[2fr_2fr_2fr_1.5fr_1fr_auto] gap-4 px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              <span>Nome</span>
              <span>Usuário</span>
              <span>Senha</span>
              <span>Funcionário</span>
              <span>Tipo</span>
              <span className="text-right">Ações</span>
            </div>
            {/* Rows */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filtrados.map(cred => (
                <div
                  key={cred.id}
                  className="group grid grid-cols-1 md:grid-cols-[2fr_2fr_2fr_1.5fr_1fr_auto] gap-3 md:gap-4 items-center px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  {/* Nome */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${tipoColor(cred.tipo)}`}>
                      {tipoIcon(cred.tipo)}
                    </div>
                    <span className="font-medium text-sm truncate">{cred.nome}</span>
                  </div>

                  {/* Usuário */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{cred.usuario}</span>
                    <button
                      onClick={() => copiar(cred.usuario, `user-${cred.id}`)}
                      className="text-zinc-400 hover:text-brand transition shrink-0 opacity-0 group-hover:opacity-100"
                      title="Copiar usuário"
                    >
                      {copiadoId === `user-${cred.id}` ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Senha */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400 truncate font-mono">
                      {senhasVisiveis.has(cred.id) ? cred.senha : "••••••••"}
                    </span>
                    <button
                      onClick={() => toggleSenha(cred.id)}
                      className="text-zinc-400 hover:text-brand transition shrink-0 opacity-0 group-hover:opacity-100"
                      title={senhasVisiveis.has(cred.id) ? "Ocultar" : "Mostrar"}
                    >
                      {senhasVisiveis.has(cred.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => copiar(cred.senha, `pw-${cred.id}`)}
                      className="text-zinc-400 hover:text-brand transition shrink-0 opacity-0 group-hover:opacity-100"
                      title="Copiar senha"
                    >
                      {copiadoId === `pw-${cred.id}` ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Funcionário */}
                  <div className="min-w-0">
                    {cred.funcionario ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                        <User className="h-2.5 w-2.5" />
                        {cred.funcionario}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-300 dark:text-zinc-600">—</span>
                    )}
                  </div>

                  {/* Tipo */}
                  <div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${tipoColor(cred.tipo)}`}>
                      {cred.tipo}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1.5 justify-end">
                    {cred.urlLogin && (
                      <a
                        href={cred.urlLogin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center h-7 w-7 rounded-lg text-brand hover:bg-brand/10 transition"
                        title="Acessar Login"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => abrirEditar(cred)}
                      className="flex items-center justify-center h-7 w-7 rounded-lg text-zinc-400 hover:text-brand hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => excluir(cred.id)}
                      className="flex items-center justify-center h-7 w-7 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                      title="Excluir"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-brand" />
                {editando ? "Editar Credencial" : "Nova Credencial"}
              </h2>
              <button onClick={fecharModal} className="text-zinc-400 hover:text-zinc-600 transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Tipo */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo *</label>
                <div className="flex gap-2">
                  {(["banco", "promotora", "sistema"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setForm(prev => ({ ...prev, tipo: t }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition ${
                        form.tipo === t
                          ? "border-brand bg-brand/10 text-brand"
                          : "border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:border-zinc-400"
                      }`}
                    >
                      {tipoIcon(t)}
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Funcionário select */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Funcionário</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <select
                    value={form.funcionario}
                    onChange={e => setForm(prev => ({ ...prev, funcionario: e.target.value }))}
                    className={`${inputCls} pl-10 appearance-none cursor-pointer`}
                  >
                    <option value="">— Nenhum —</option>
                    {funcionarios.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Banco select (se tipo = banco) */}
              {form.tipo === "banco" && bancos.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Banco</label>
                  <select
                    value={form.bancoId}
                    onChange={e => onBancoChange(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Selecione...</option>
                    {bancos.map(b => (
                      <option key={b.id} value={b.id}>{b.nome}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nome */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome / Identificação *</label>
                <input
                  required
                  value={form.nome}
                  onChange={e => setForm(prev => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: UNNO Portal, Promotora BEVI, WhatsApp Business"
                  className={inputCls}
                />
              </div>

              {/* URL de Login */}
              <div className="space-y-2">
                <label className="text-sm font-medium">URL de Login</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="url"
                    value={form.urlLogin}
                    onChange={e => setForm(prev => ({ ...prev, urlLogin: e.target.value }))}
                    placeholder="https://portal.banco.com.br"
                    className={`${inputCls} pl-10`}
                  />
                </div>
              </div>

              {/* Usuário e Senha */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Usuário *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                      required
                      value={form.usuario}
                      onChange={e => setForm(prev => ({ ...prev, usuario: e.target.value }))}
                      placeholder="login@email.com"
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Senha *</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                      required
                      type="password"
                      value={form.senha}
                      onChange={e => setForm(prev => ({ ...prev, senha: e.target.value }))}
                      placeholder="••••••••"
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-500">Observações</label>
                <textarea
                  rows={2}
                  value={form.observacoes}
                  onChange={e => setForm(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Notas adicionais..."
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-6 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={fecharModal} className="px-4 py-2 text-sm text-zinc-600 hover:text-zinc-900 transition">
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={!form.nome || !form.usuario || !form.senha}
                className="flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-90 disabled:opacity-50 transition"
              >
                <KeyRound className="h-4 w-4" /> {editando ? "Salvar" : "Cadastrar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
