"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  ToggleLeft,
  ToggleRight,
  ChevronRight,
  Layers,
  BookOpen,
  Calculator,
  Loader2,
  X,
} from "lucide-react";

type BancoComContagem = {
  id: string;
  nome: string;
  codigoCompe: string | null;
  cnpj: string | null;
  tipo: string;
  ativo: boolean;
  ativoSimulacao: boolean;
  observacoes: string | null;
  _count: {
    produtosCredito: number;
    tabelasCoeficiente: number;
    regrasProduto: number;
  };
};

export function BancosClient({
  bancos: bancosIniciais,
  empresaId,
}: {
  bancos: BancoComContagem[];
  empresaId: string;
}) {
  const router = useRouter();
  const [bancos, setBancos] = useState(bancosIniciais);
  const [busca, setBusca] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({ nome: "", codigoCompe: "", cnpj: "", tipo: "consignado" });
  const [erro, setErro] = useState<string | null>(null);

  const filtrados = bancos.filter(
    (b) =>
      b.nome.toLowerCase().includes(busca.toLowerCase()) ||
      b.codigoCompe?.includes(busca) ||
      b.cnpj?.includes(busca)
  );

  async function criarBanco(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);

    const res = await fetch("/api/bancos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setErro(data.error);
      setSalvando(false);
      return;
    }

    setModalAberto(false);
    setForm({ nome: "", codigoCompe: "", cnpj: "", tipo: "consignado" });
    setSalvando(false);
    router.refresh();
  }

  async function toggleSimulacao(bancoId: string, valor: boolean) {
    await fetch(`/api/bancos/${bancoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativoSimulacao: valor }),
    });
    setBancos((prev) =>
      prev.map((b) => (b.id === bancoId ? { ...b, ativoSimulacao: valor } : b))
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 mb-1">
              <Building2 className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">
                Gestão de Bancos
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Bancos Parceiros
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1">
              Gerencie os bancos e suas tabelas comerciais
            </p>
          </div>
          <button
            onClick={() => setModalAberto(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 transition"
          >
            <Plus className="h-4 w-4" />
            Adicionar Banco
          </button>
        </header>

        {/* Busca */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nome, COMPE ou CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
          />
        </div>

        {/* Grid de Bancos */}
        {filtrados.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zinc-600">
              {busca ? "Nenhum banco encontrado" : "Nenhum banco cadastrado"}
            </h3>
            <p className="text-sm text-zinc-400 mt-1">
              {busca
                ? "Tente buscar por outro termo"
                : "Clique em \"Adicionar Banco\" ou importe roteiros no Motor de Regras para criar bancos automaticamente."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map((banco) => (
              <div
                key={banco.id}
                className={`group relative rounded-2xl border bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all overflow-hidden ${
                  banco.ativo
                    ? "border-zinc-200 dark:border-zinc-800"
                    : "border-zinc-200/50 dark:border-zinc-800/50 opacity-60"
                }`}
              >
                {/* Barra de status */}
                <div
                  className={`h-1 ${
                    banco.ativoSimulacao
                      ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                      : "bg-zinc-200 dark:bg-zinc-800"
                  }`}
                />

                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {banco.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                          {banco.nome}
                        </h3>
                        <p className="text-xs text-zinc-500">
                          {banco.codigoCompe ? `COMPE ${banco.codigoCompe}` : banco.tipo}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSimulacao(banco.id, !banco.ativoSimulacao);
                      }}
                      className="shrink-0"
                      title={
                        banco.ativoSimulacao
                          ? "Desativar na simulação"
                          : "Ativar na simulação"
                      }
                    >
                      {banco.ativoSimulacao ? (
                        <ToggleRight className="h-6 w-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
                      )}
                    </button>
                  </div>

                  {/* KPIs inline */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-zinc-500 mb-0.5">
                        <Layers className="h-3 w-3" />
                      </div>
                      <p className="text-lg font-bold tabular-nums">
                        {banco._count.produtosCredito}
                      </p>
                      <p className="text-[10px] text-zinc-500 uppercase">Produtos</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-zinc-500 mb-0.5">
                        <Calculator className="h-3 w-3" />
                      </div>
                      <p className="text-lg font-bold tabular-nums">
                        {banco._count.tabelasCoeficiente}
                      </p>
                      <p className="text-[10px] text-zinc-500 uppercase">Tabelas</p>
                    </div>
                    <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-zinc-500 mb-0.5">
                        <BookOpen className="h-3 w-3" />
                      </div>
                      <p className="text-lg font-bold tabular-nums">
                        {banco._count.regrasProduto}
                      </p>
                      <p className="text-[10px] text-zinc-500 uppercase">Regras</p>
                    </div>
                  </div>

                  <button
                    onClick={() => router.push(`/bancos/${banco.id}`)}
                    className="flex items-center justify-center gap-1 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition font-medium"
                  >
                    Gerenciar
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Criação */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-semibold">Adicionar Banco</h2>
              <button
                onClick={() => setModalAberto(false)}
                className="text-zinc-400 hover:text-zinc-600 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={criarBanco} className="p-6 space-y-4">
              {erro && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  {erro}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Nome do Banco *
                </label>
                <input
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Banco Inbursa"
                  className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Código COMPE
                  </label>
                  <input
                    value={form.codigoCompe}
                    onChange={(e) => setForm({ ...form, codigoCompe: e.target.value })}
                    placeholder="Ex: 012"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    CNPJ
                  </label>
                  <input
                    value={form.cnpj}
                    onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:opacity-95 disabled:opacity-50 transition"
                >
                  {salvando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {salvando ? "Salvando..." : "Criar Banco"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
