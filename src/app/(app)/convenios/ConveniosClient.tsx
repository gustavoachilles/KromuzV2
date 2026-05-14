"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Plus,
  X,
  Loader2,
  Building2,
  Calculator,
  BookOpen,
  Link2,
  Unlink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type BancoConvenio = {
  id: string;
  banco: { id: string; nome: string };
};

type Convenio = {
  id: string;
  nome: string;
  slug: string;
  tipo: string | null;
  descricao: string | null;
  createdAt: string | Date;
  bancoConvenios: BancoConvenio[];
  _count: {
    tabelasCoeficiente: number;
    regrasProduto: number;
  };
};

type BancoDisponivel = { id: string; nome: string };

const tipoConvenio: Record<string, { label: string; color: string }> = {
  inss: { label: "INSS", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" },
  siape: { label: "SIAPE", color: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400" },
  forcas_armadas: { label: "Forças Armadas", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400" },
  estado: { label: "Estado/Município", color: "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand" },
  outro: { label: "Outro", color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
};

export function ConveniosClient({
  convenios: conveniosIniciais,
  bancos,
}: {
  convenios: Convenio[];
  bancos: BancoDisponivel[];
}) {
  const router = useRouter();
  const [convenios, setConvenios] = useState(conveniosIniciais);
  const [modal, setModal] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [vinculando, setVinculando] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    slug: "",
    tipo: "inss",
    descricao: "",
  });

  async function criarConvenio(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const res = await fetch("/api/convenios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: form.nome,
        slug: form.slug,
        tipo: form.tipo || null,
        descricao: form.descricao || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setErro(data.error);
      setSalvando(false);
      return;
    }

    setModal(false);
    setSalvando(false);
    setForm({ nome: "", slug: "", tipo: "inss", descricao: "" });
    router.refresh();
  }

  async function vincularBanco(convenioId: string, bancoId: string) {
    setVinculando(bancoId);
    const res = await fetch(`/api/convenios/${convenioId}/bancos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bancoId }),
    });
    setVinculando(null);
    if (res.ok) router.refresh();
  }

  async function desvincularBanco(convenioId: string, bancoId: string) {
    setVinculando(bancoId);
    await fetch(`/api/convenios/${convenioId}/bancos`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bancoId }),
    });
    setVinculando(null);
    router.refresh();
  }

  function autoSlug(nome: string) {
    return nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <Shield className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">
                Convênios
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Convênios
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              {convenios.length} convênio{convenios.length !== 1 ? "s" : ""} cadastrado{convenios.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 transition"
          >
            <Plus className="h-4 w-4" />
            Novo Convênio
          </button>
        </header>

        {/* Lista */}
        {convenios.length === 0 ? (
          <div className="text-center py-20">
            <Shield className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-600">Nenhum convênio cadastrado</h3>
            <p className="text-sm text-zinc-400 mt-1">
              Crie convênios como INSS, SIAPE, Forças Armadas e vincule bancos a eles.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {convenios.map((conv) => {
              const aberto = expandido === conv.id;
              const tipo = tipoConvenio[conv.tipo || "outro"] || tipoConvenio.outro;
              const bancosVinculados = conv.bancoConvenios.map((bc) => bc.banco.id);
              const bancosDisponiveis = bancos.filter((b) => !bancosVinculados.includes(b.id));

              return (
                <div
                  key={conv.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden"
                >
                  {/* Header */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition"
                    onClick={() => setExpandido(aberto ? null : conv.id)}
                  >
                    <div className="h-10 w-10 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold text-xs shrink-0">
                      {conv.nome.slice(0, 3).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {conv.nome}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipo.color}`}>
                          {tipo.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {conv.bancoConvenios.length} banco{conv.bancoConvenios.length !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calculator className="h-3 w-3" />
                          {conv._count.tabelasCoeficiente} tabela{conv._count.tabelasCoeficiente !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {conv._count.regrasProduto} regra{conv._count.regrasProduto !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    {aberto ? (
                      <ChevronUp className="h-5 w-5 text-zinc-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-zinc-400 shrink-0" />
                    )}
                  </div>

                  {/* Expandido: bancos vinculados */}
                  {aberto && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800 px-5 py-5 bg-zinc-50/50 dark:bg-zinc-800/20 space-y-4">
                      {conv.descricao && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">{conv.descricao}</p>
                      )}

                      <div>
                        <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">
                          Bancos Vinculados
                        </h4>
                        {conv.bancoConvenios.length === 0 ? (
                          <p className="text-sm text-zinc-400 italic">Nenhum banco vinculado.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {conv.bancoConvenios.map((bc) => (
                              <span
                                key={bc.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-sm"
                              >
                                <Building2 className="h-3 w-3 text-brand" />
                                {bc.banco.nome}
                                <button
                                  onClick={() => desvincularBanco(conv.id, bc.banco.id)}
                                  className="ml-1 text-zinc-400 hover:text-red-500 transition"
                                  title="Desvincular"
                                >
                                  <Unlink className="h-3 w-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {bancosDisponiveis.length > 0 && (
                        <div>
                          <h4 className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-2">
                            Vincular Banco
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {bancosDisponiveis.map((b) => (
                              <button
                                key={b.id}
                                disabled={vinculando === b.id}
                                onClick={() => vincularBanco(conv.id, b.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-400 hover:border-brand/50 hover:text-brand transition disabled:opacity-50"
                              >
                                {vinculando === b.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Link2 className="h-3 w-3" />
                                )}
                                {b.nome}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <p className="text-[10px] text-zinc-400">
                        slug: <code className="font-mono">{conv.slug}</code>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Novo Convênio */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">Novo Convênio</h2>
              <button
                onClick={() => setModal(false)}
                className="text-zinc-400 hover:text-zinc-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={criarConvenio} className="p-6 space-y-4">
              {erro && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  {erro}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Nome *</label>
                <input
                  required
                  value={form.nome}
                  onChange={(e) =>
                    setForm({ ...form, nome: e.target.value, slug: autoSlug(e.target.value) })
                  }
                  placeholder="Ex: INSS Aposentadoria"
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Slug</label>
                  <input
                    required
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    placeholder="inss_aposentadoria"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand/50"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50"
                  >
                    <option value="inss">INSS</option>
                    <option value="siape">SIAPE</option>
                    <option value="forcas_armadas">Forças Armadas</option>
                    <option value="estado">Estado/Município</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-500">Descrição (opcional)</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={2}
                  placeholder="Observações sobre este convênio..."
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/25 hover:opacity-95 disabled:opacity-50 transition"
                >
                  {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {salvando ? "Criando..." : "Criar Convênio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
