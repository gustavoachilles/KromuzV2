"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, Users, Phone, Mail, MapPin, CreditCard, ChevronLeft, ChevronRight, Eye, EyeOff, Calendar, DollarSign, Hash, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Cliente {
  id: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  dataNascimento?: string;
  uf?: string;
  cidade?: string;
  bairro?: string;
  numeroBeneficio?: string;
  especieBeneficio?: number;
  margemLivre?: number;
  margemRmc?: number;
  margemRcc?: number;
  renda?: number;
  ddb?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bancoCliente?: string;
  agenciaCliente?: string;
  contaCliente?: string;
  tipoContaCliente?: string;
  status?: string;
  vendedorNome?: string;
  vendedorEmail?: string;
  observacoes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ClientesClient() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);
  const [selecionado, setSelecionado] = useState<Cliente | null>(null);
  const [revelarCpf, setRevelarCpf] = useState<Record<string, boolean>>({});
  const [revelarTel, setRevelarTel] = useState<Record<string, boolean>>({});
  const limit = 50;

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      if (busca.trim()) params.set("busca", busca.trim());
      const res = await fetch(`/api/clientes?${params}`);
      const data = await res.json();
      setClientes(data.clientes || []);
      setTotal(data.total || 0);
    } catch {
      setClientes([]);
    } finally {
      setLoading(false);
    }
  }, [page, busca]);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  // Debounce da busca
  const [buscaInput, setBuscaInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => { setBusca(buscaInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [buscaInput]);

  const totalPages = Math.ceil(total / limit);

  const mascaraCpf = (cpf: string) => {
    if (!cpf) return "—";
    return cpf;
  };

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR");
  };

  const calcIdade = (d?: string) => {
    if (!d) return null;
    const born = new Date(d);
    const today = new Date();
    let age = today.getFullYear() - born.getFullYear();
    if (today.getMonth() < born.getMonth() || (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())) age--;
    return age;
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-[1600px] mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Clientes</h1>
                <p className="text-xs text-zinc-500">{total} clientes na carteira</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              value={buscaInput}
              onChange={e => setBuscaInput(e.target.value)}
              placeholder="Buscar por nome, CPF, telefone, e-mail ou NB..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Lista */}
          <div className={`${selecionado ? "w-1/2" : "w-full"} transition-all duration-300`}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : clientes.length === 0 ? (
              <div className="text-center py-20 text-zinc-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">Nenhum cliente encontrado</p>
                <p className="text-sm mt-1">Clientes aparecem aqui quando têm CPF cadastrado</p>
              </div>
            ) : (
              <>
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                        <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Cliente</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">CPF</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Telefone</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Cidade/UF</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">NB</th>
                        <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">Vendedor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.map((c, i) => (
                        <motion.tr
                          key={c.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          onClick={() => setSelecionado(selecionado?.id === c.id ? null : c)}
                          className={`cursor-pointer border-b border-zinc-100 dark:border-zinc-800/50 transition-colors ${
                            selecionado?.id === c.id
                              ? "bg-blue-50 dark:bg-blue-950/30"
                              : "hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {c.nome?.charAt(0)?.toUpperCase() || "?"}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white truncate max-w-[180px]">{c.nome}</p>
                                {c.email && <p className="text-[11px] text-zinc-400 truncate max-w-[180px]">{c.email}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span className={`text-sm font-mono ${revelarCpf[c.id] ? "text-zinc-700 dark:text-zinc-300" : "blur-[4px] select-none text-zinc-400"}`}>
                                {c.cpf || "—"}
                              </span>
                              <button
                                onClick={e => { e.stopPropagation(); setRevelarCpf(prev => ({ ...prev, [c.id]: !prev[c.id] })); }}
                                className="p-0.5 text-zinc-400 hover:text-blue-500 transition"
                              >
                                {revelarCpf[c.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <span className={`text-sm ${revelarTel[c.id] ? "text-zinc-700 dark:text-zinc-300" : "blur-[4px] select-none text-zinc-400"}`}>
                                {c.telefone || "—"}
                              </span>
                              {c.telefone && (
                                <button
                                  onClick={e => { e.stopPropagation(); setRevelarTel(prev => ({ ...prev, [c.id]: !prev[c.id] })); }}
                                  className="p-0.5 text-zinc-400 hover:text-blue-500 transition"
                                >
                                  {revelarTel[c.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                            {c.cidade && c.uf ? `${c.cidade}/${c.uf}` : c.uf || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-zinc-600 dark:text-zinc-400">
                            {c.numeroBeneficio || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400 truncate max-w-[120px]">
                            {c.vendedorNome || "—"}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 px-2">
                    <span className="text-xs text-zinc-400">
                      Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, total)} de {total}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 px-3">{page} / {totalPages}</span>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 transition">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Painel lateral de detalhes */}
          <AnimatePresence>
            {selecionado && (
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.25 }}
                className="w-1/2 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-y-auto"
                style={{ maxHeight: "calc(100vh - 200px)" }}
              >
                <div className="p-6 space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-500/20">
                      {selecionado.nome?.charAt(0)?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{selecionado.nome}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        {selecionado.vendedorNome && (
                          <span className="text-[11px] bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                            {selecionado.vendedorNome}
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-400">
                          desde {formatDate(selecionado.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dados Pessoais */}
                  <Section title="Dados Pessoais" icon={<Users className="h-4 w-4" />}>
                    <InfoRow label="CPF" value={selecionado.cpf} sensitive />
                    <InfoRow label="Telefone" value={selecionado.telefone} sensitive />
                    <InfoRow label="E-mail" value={selecionado.email} />
                    <InfoRow label="Nascimento" value={selecionado.dataNascimento ? `${formatDate(selecionado.dataNascimento)} (${calcIdade(selecionado.dataNascimento)} anos)` : undefined} />
                    <InfoRow label="Renda" value={selecionado.renda ? `R$ ${Number(selecionado.renda).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : undefined} />
                  </Section>

                  {/* Benefício */}
                  <Section title="Benefício INSS" icon={<Hash className="h-4 w-4" />}>
                    <InfoRow label="NB" value={selecionado.numeroBeneficio} />
                    <InfoRow label="Espécie" value={selecionado.especieBeneficio?.toString()} />
                    <InfoRow label="DDB" value={formatDate(selecionado.ddb)} />
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <MargemCard label="Livre" value={selecionado.margemLivre} />
                      <MargemCard label="RMC" value={selecionado.margemRmc} />
                      <MargemCard label="RCC" value={selecionado.margemRcc} />
                    </div>
                  </Section>

                  {/* Endereço */}
                  <Section title="Endereço" icon={<MapPin className="h-4 w-4" />}>
                    <InfoRow label="CEP" value={selecionado.cep} />
                    <InfoRow label="Logradouro" value={[selecionado.logradouro, selecionado.numero].filter(Boolean).join(", ")} />
                    <InfoRow label="Complemento" value={selecionado.complemento} />
                    <InfoRow label="Bairro" value={selecionado.bairro} />
                    <InfoRow label="Cidade/UF" value={[selecionado.cidade, selecionado.uf].filter(Boolean).join("/")} />
                  </Section>

                  {/* Dados Bancários */}
                  <Section title="Dados Bancários" icon={<CreditCard className="h-4 w-4" />}>
                    <InfoRow label="Banco" value={selecionado.bancoCliente} />
                    <InfoRow label="Agência" value={selecionado.agenciaCliente} />
                    <InfoRow label="Conta" value={selecionado.contaCliente} />
                    <InfoRow label="Tipo" value={selecionado.tipoContaCliente === "CC" ? "Corrente" : selecionado.tipoContaCliente === "CP" ? "Poupança" : selecionado.tipoContaCliente} />
                  </Section>

                  {/* Observações */}
                  {selecionado.observacoes && (
                    <Section title="Observações" icon={<Mail className="h-4 w-4" />}>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{selecionado.observacoes}</p>
                    </Section>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-blue-500">{icon}</span>
        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-2 pl-6">{children}</div>
    </div>
  );
}

function InfoRow({ label, value, sensitive }: { label: string; value?: string | null; sensitive?: boolean }) {
  const [revealed, setRevealed] = useState(false);

  if (!value || value === "—") {
    return (
      <div className="flex items-center justify-between py-1">
        <span className="text-[12px] text-zinc-400 font-medium">{label}</span>
        <span className="text-[12px] text-zinc-300 dark:text-zinc-600">—</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[12px] text-zinc-400 font-medium">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`text-[13px] font-medium text-zinc-700 dark:text-zinc-300 ${sensitive && !revealed ? "blur-[4px] select-none" : ""}`}>
          {value}
        </span>
        {sensitive && (
          <button onClick={() => setRevealed(!revealed)} className="p-0.5 text-zinc-400 hover:text-blue-500 transition">
            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}

function MargemCard({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/50 p-3 text-center">
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mt-1">
        {value != null ? `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
      </p>
    </div>
  );
}
