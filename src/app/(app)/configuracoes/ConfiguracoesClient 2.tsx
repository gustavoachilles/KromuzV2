"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Settings,
  Building2,
  Users,
  Save,
  Loader2,
  CheckCircle2,
  Shield,
  Crown,
  User,
  Mail,
  Calendar,
  Palette,
  Network,
  Power
} from "lucide-react";

type BancoConfig = {
  id: string;
  nome: string;
  logoUrl: string | null;
  permiteIntegracao: boolean;
  credenciaisApi: any;
};

type Empresa = {
  id: string;
  nomeEmpresa: string;
  nomeFantasia: string | null;
  cpfCnpj: string | null;
  status: string;
  planoSlug: string;
  diasTrial: number;
  dataTrialFim: string | Date | null;
  logoUrl: string | null;
  corPrimaria: string | null;
  createdAt: string | Date;
};

type Usuario = {
  id: string;
  email: string;
  nome: string | null;
  perfilSlug: string;
  ativo: boolean;
  createdAt: string | Date;
};

const perfilLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  admin: {
    label: "Administrador",
    icon: <Crown className="h-3.5 w-3.5" />,
    color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  gerente: {
    label: "Gerente",
    icon: <Shield className="h-3.5 w-3.5" />,
    color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
  },
  vendedor: {
    label: "Vendedor",
    icon: <User className="h-3.5 w-3.5" />,
    color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  },
};

const statusLabels: Record<string, { label: string; color: string }> = {
  ativo: { label: "Ativo", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  teste: { label: "Teste / Trial", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  suspenso: { label: "Suspenso", color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400" },
};

export function ConfiguracoesClient({
  empresa,
  usuarios,
  bancos = [],
  sessao,
}: {
  empresa: Empresa;
  usuarios: Usuario[];
  bancos?: BancoConfig[];
  sessao: { userId: string; perfilSlug: string };
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"empresa" | "equipe" | "integracoes">("empresa");
  const isAdmin = sessao.perfilSlug === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header>
          <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
            <Settings className="h-5 w-5" />
            <span className="text-xs uppercase tracking-widest font-semibold">
              Configurações
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Configurações
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">
            Gerencie os dados da empresa e da equipe
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-1 w-fit">
          <button
            onClick={() => setTab("empresa")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === "empresa"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <Building2 className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Empresa
          </button>
          <button
            onClick={() => setTab("equipe")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              tab === "equipe"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Users className="h-4 w-4" />
            Equipe ({usuarios.length})
          </button>
          <button
            onClick={() => setTab("integracoes")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
              tab === "integracoes"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            }`}
          >
            <Network className="h-4 w-4" />
            Integrações Bancárias
          </button>
        </div>

        {/* Tab: Empresa */}
        {tab === "empresa" && (
          <EmpresaTab empresa={empresa} isAdmin={isAdmin} />
        )}

        {/* Tab: Equipe */}
        {tab === "equipe" && (
          <EquipeTab usuarios={usuarios} isAdmin={isAdmin} />
        )}

        {/* Tab: Integrações */}
        {tab === "integracoes" && (
          <IntegracoesTab bancos={bancos} isAdmin={isAdmin} />
        )}
      </div>
    </div>
  );
}

// ─── Empresa Tab ──────────────────────────────────────────────

function EmpresaTab({ empresa, isAdmin }: { empresa: Empresa; isAdmin: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    nomeEmpresa: empresa.nomeEmpresa,
    nomeFantasia: empresa.nomeFantasia || "",
    cpfCnpj: empresa.cpfCnpj || "",
    corPrimaria: empresa.corPrimaria || "#7c3aed",
  });
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);

    await fetch("/api/configuracoes/empresa", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nomeEmpresa: form.nomeEmpresa,
        nomeFantasia: form.nomeFantasia || null,
        cpfCnpj: form.cpfCnpj || null,
        corPrimaria: form.corPrimaria || null,
      }),
    });

    setSalvando(false);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 3000);
    router.refresh();
  }

  const status = statusLabels[empresa.status] || statusLabels.teste;

  return (
    <div className="space-y-6">
      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Status</p>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.label}
          </span>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Plano</p>
          <p className="text-lg font-bold capitalize">{empresa.planoSlug}</p>
        </div>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
          <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Membro desde</p>
          <p className="text-sm font-medium tabular-nums">
            {new Date(empresa.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Formulário */}
      <form
        onSubmit={salvar}
        className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-violet-600" />
          Dados da Empresa
        </h2>

        {!isAdmin && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            ⚠️ Apenas administradores podem editar as configurações da empresa.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Razão Social *
            </label>
            <input
              required
              disabled={!isAdmin}
              value={form.nomeEmpresa}
              onChange={(e) => setForm({ ...form, nomeEmpresa: e.target.value })}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Nome Fantasia
            </label>
            <input
              disabled={!isAdmin}
              value={form.nomeFantasia}
              onChange={(e) => setForm({ ...form, nomeFantasia: e.target.value })}
              placeholder="Opcional"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              CPF / CNPJ
            </label>
            <input
              disabled={!isAdmin}
              value={form.cpfCnpj}
              onChange={(e) => setForm({ ...form, cpfCnpj: e.target.value })}
              placeholder="00.000.000/0001-00"
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5" />
              Cor Primária
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                disabled={!isAdmin}
                value={form.corPrimaria}
                onChange={(e) => setForm({ ...form, corPrimaria: e.target.value })}
                className="h-10 w-14 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer disabled:opacity-50"
              />
              <span className="text-sm font-mono text-zinc-500">{form.corPrimaria}</span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={salvando}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 disabled:opacity-50 transition"
            >
              {salvando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : salvo ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {salvando ? "Salvando..." : salvo ? "Salvo!" : "Salvar Alterações"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

// ─── Equipe Tab ────────────────────────────────────────────────

function EquipeTab({ usuarios, isAdmin }: { usuarios: Usuario[]; isAdmin: boolean }) {
  const router = useRouter();
  const [editando, setEditando] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function atualizarPerfil(id: string, perfilSlug: string) {
    setSalvando(true);
    await fetch("/api/configuracoes/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, perfilSlug }),
    });
    setSalvando(false);
    setEditando(null);
    router.refresh();
  }

  async function toggleAtivo(id: string, ativo: boolean) {
    await fetch("/api/configuracoes/usuarios", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ativo }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-600" />
          Equipe
        </h2>
      </div>

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left px-5 py-3 font-medium text-zinc-600 dark:text-zinc-400">Usuário</th>
              <th className="text-left px-5 py-3 font-medium text-zinc-600 dark:text-zinc-400">Perfil</th>
              <th className="text-center px-5 py-3 font-medium text-zinc-600 dark:text-zinc-400">Status</th>
              <th className="text-left px-5 py-3 font-medium text-zinc-600 dark:text-zinc-400">Membro desde</th>
              {isAdmin && <th className="px-5 py-3" />}
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const perfil = perfilLabels[u.perfilSlug] || perfilLabels.vendedor;
              return (
                <tr
                  key={u.id}
                  className={`border-b border-zinc-100 dark:border-zinc-800/50 ${
                    !u.ativo ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {(u.nome || u.email).slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-100">
                          {u.nome || "Sem nome"}
                        </p>
                        <p className="text-xs text-zinc-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {u.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {editando === u.id ? (
                      <select
                        defaultValue={u.perfilSlug}
                        onChange={(e) => atualizarPerfil(u.id, e.target.value)}
                        className="rounded-lg border border-violet-300 dark:border-violet-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                      >
                        <option value="admin">Administrador</option>
                        <option value="gerente">Gerente</option>
                        <option value="vendedor">Vendedor</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${perfil.color}`}>
                        {perfil.icon}
                        {perfil.label}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.ativo
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                      }`}
                    >
                      {u.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-zinc-500 text-xs tabular-nums flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                  {isAdmin && (
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {editando !== u.id && (
                          <button
                            onClick={() => setEditando(u.id)}
                            className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-800 font-medium"
                          >
                            Editar
                          </button>
                        )}
                        <button
                          onClick={() => toggleAtivo(u.id, !u.ativo)}
                          className={`text-xs font-medium ${
                            u.ativo
                              ? "text-red-500 hover:text-red-700"
                              : "text-emerald-500 hover:text-emerald-700"
                          }`}
                        >
                          {u.ativo ? "Desativar" : "Reativar"}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Integrações Tab ───────────────────────────────────────────

function IntegracoesTab({ bancos, isAdmin }: { bancos: BancoConfig[]; isAdmin: boolean }) {
  const router = useRouter();
  const [salvando, setSalvando] = useState<string | null>(null);

  async function toggleIntegracao(id: string, permiteIntegracao: boolean) {
    if (!isAdmin) return;
    setSalvando(id);
    await fetch("/api/bancos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, permiteIntegracao }),
    });
    setSalvando(null);
    router.refresh();
  }

  async function salvarApiKey(id: string, token: string) {
    if (!isAdmin) return;
    setSalvando(id);
    await fetch("/api/bancos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, credenciaisApi: { token } }),
    });
    setSalvando(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Network className="h-5 w-5 text-violet-600" />
            Automação Bancária (APIs)
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            Configure os tokens de integração para que as propostas sejam digitadas automaticamente ao entrarem em "DIGITADA".
          </p>
        </div>
      </div>

      {!isAdmin && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          ⚠️ Apenas administradores podem configurar APIs bancárias.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bancos.map((b) => (
          <div key={b.id} className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-6 flex flex-col transition hover:shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-400">
                  {b.nome.substring(0,2).toUpperCase()}
                </div>
                <h3 className="font-bold text-lg">{b.nome}</h3>
              </div>
              
              <button
                disabled={!isAdmin || salvando === b.id}
                onClick={() => toggleIntegracao(b.id, !b.permiteIntegracao)}
                className={`p-2 rounded-full transition ${b.permiteIntegracao ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-zinc-400'}`}
                title={b.permiteIntegracao ? "Desativar Integração" : "Ativar Integração"}
              >
                {salvando === b.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-2 flex-1">
              <label className="text-sm font-medium text-zinc-500">API Token / Chave Webhook</label>
              <div className="flex gap-2">
                <input 
                  type="password"
                  disabled={!isAdmin || !b.permiteIntegracao}
                  placeholder={b.permiteIntegracao ? "Colar Token do Banco..." : "Ative a integração primeiro"}
                  defaultValue={b.credenciaisApi?.token || ""}
                  onBlur={(e) => {
                    if (e.target.value !== (b.credenciaisApi?.token || "")) {
                      salvarApiKey(b.id, e.target.value);
                    }
                  }}
                  className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition disabled:opacity-50"
                />
              </div>
            </div>

            {b.permiteIntegracao && b.credenciaisApi?.token && (
              <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-2 rounded-lg">
                <CheckCircle2 className="w-4 h-4" /> Integração configurada e ativa
              </div>
            )}
          </div>
        ))}
        {bancos.length === 0 && (
          <div className="col-span-full text-center py-12 text-zinc-500">
            Nenhum banco cadastrado. Vá em Bancos/Convênios para adicionar o primeiro.
          </div>
        )}
      </div>
    </div>
  );
}
