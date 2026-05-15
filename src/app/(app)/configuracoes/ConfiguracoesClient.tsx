"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Settings, 
  Building2, 
  Users, 
  Palette, 
  ShieldCheck, 
  Save, 
  Upload, 
  Link2,
  Lock,
  Globe,
  Bell,
  Pencil,
  Plus,
  Trash2,
  Shield
} from "lucide-react";
import { MODULOS_SISTEMA, type Permissoes } from "@/lib/permissions";
import { maskPhone, maskCPF, maskCEP, maskDate, dateToISO, isoToDate, fetchCEP, isValidDate } from "@/lib/masks";

export function ConfiguracoesClient({ empresa, usuarios, bancos, sessao }: any) {
  const router = useRouter();
  const [tab, setTab] = useState("empresa");
  const [saving, setSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [emailError, setEmailError] = useState("");
  const [userModalTab, setUserModalTab] = useState("geral");
  
  const [userForm, setUserForm] = useState({
    nome: "",
    email: "",
    perfilSlug: "vendedor",
    ativo: true,
    // Pessoais
    telefone: "", cpf: "", dataNascimento: "", rg: "", orgaoEmissor: "",
    genero: "", estadoCivil: "", timeFavorito: "",
    // Endereço
    cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
    // Bancário
    bancoNome: "", bancoAgencia: "", bancoConta: "", bancoTipoConta: "", chavePix: "", tipoChavePix: "",
    // Contratação
    dataContratacao: "", dataDesligamento: "", observacoesPessoais: ""
  });
  
  const [formEmpresa, setFormEmpresa] = useState({
    nomeEmpresa: empresa.nomeEmpresa,
    nomeFantasia: empresa.nomeFantasia || "",
    logoUrl: empresa.logoUrl || "",
    corPrimaria: empresa.corPrimaria || "#7c3aed",
  });

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 2MB para Base64 não explodir o banco)
    if (file.size > 2 * 1024 * 1024) {
      alert("Arquivo muito grande! Máximo 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormEmpresa({ ...formEmpresa, logoUrl: reader.result as string });
    };
    reader.readAsDataURL(file);
  }

  async function handleSaveEmpresa() {
    setSaving(true);
    try {
      const res = await fetch("/api/configuracoes/empresa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formEmpresa)
      });
      if (!res.ok) throw new Error();
      alert("✅ Identidade Visual atualizada com sucesso!");
      router.refresh();
    } catch (err) {
      alert("Erro ao salvar as configurações.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveUsuario() {
    setSaving(true);
    try {
      if (editingUser) {
        // PATCH — envia todos os campos
        const { email: _email, ...editableFields } = userForm;
        // Converter datas mascaradas dd/mm/aaaa para ISO yyyy-mm-dd
        const payload = { ...editableFields };
        if (payload.dataNascimento) payload.dataNascimento = dateToISO(payload.dataNascimento) || payload.dataNascimento;
        if (payload.dataContratacao) payload.dataContratacao = dateToISO(payload.dataContratacao) || payload.dataContratacao;
        if (payload.dataDesligamento) payload.dataDesligamento = dateToISO(payload.dataDesligamento) || payload.dataDesligamento;
        const res = await fetch("/api/configuracoes/usuarios", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingUser.id, ...payload })
        });
        if (!res.ok) {
           const err = await res.json();
           throw new Error(err.error || "Erro ao atualizar");
        }
        alert("Membro atualizado com sucesso!");
      } else {
        // Validar email antes de enviar
        if (!validateEmail(userForm.email)) { setSaving(false); return; }

        // POST
        const res = await fetch("/api/configuracoes/usuarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nome: userForm.nome,
            email: userForm.email,
            perfilSlug: userForm.perfilSlug
          })
        });
        if (!res.ok) {
           const err = await res.json();
           throw new Error(err.error || "Erro ao convidar");
        }
        alert("Membro adicionado com sucesso!\nA senha provisória dele é: Mudar@123");
      }
      
      router.refresh();
      setIsAddModalOpen(false);
      setEditingUser(null);
      setEmailError("");
      resetUserForm();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  function resetUserForm() {
    setUserForm({
      nome: "", email: "", perfilSlug: "vendedor", ativo: true,
      telefone: "", cpf: "", dataNascimento: "", rg: "", orgaoEmissor: "",
      genero: "", estadoCivil: "", timeFavorito: "",
      cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "", uf: "",
      bancoNome: "", bancoAgencia: "", bancoConta: "", bancoTipoConta: "", chavePix: "", tipoChavePix: "",
      dataContratacao: "", dataDesligamento: "", observacoesPessoais: ""
    });
  }

  function validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) { setEmailError("E-mail é obrigatório"); return false; }
    if (!re.test(email)) { setEmailError("E-mail inválido. Use o formato nome@email.com"); return false; }
    setEmailError("");
    return true;
  }

  function openEditModal(user: any) {
    setEditingUser(user);
    setUserForm({
      nome: user.nome || "",
      email: user.email || "",
      perfilSlug: user.perfilSlug || "vendedor",
      ativo: user.ativo,
      telefone: user.telefone ? maskPhone(user.telefone) : "", cpf: user.cpf ? maskCPF(user.cpf) : "",
      dataNascimento: user.dataNascimento ? isoToDate(user.dataNascimento) : "",
      rg: user.rg || "", orgaoEmissor: user.orgaoEmissor || "",
      genero: user.genero || "", estadoCivil: user.estadoCivil || "",
      timeFavorito: user.timeFavorito || "",
      cep: user.cep ? maskCEP(user.cep) : "", logradouro: user.logradouro || "",
      numero: user.numero || "", complemento: user.complemento || "",
      bairro: user.bairro || "", cidade: user.cidade || "", uf: user.uf || "",
      bancoNome: user.bancoNome || "", bancoAgencia: user.bancoAgencia || "",
      bancoConta: user.bancoConta || "", bancoTipoConta: user.bancoTipoConta || "",
      chavePix: user.chavePix || "", tipoChavePix: user.tipoChavePix || "",
      dataContratacao: user.dataContratacao ? isoToDate(user.dataContratacao) : "",
      dataDesligamento: user.dataDesligamento ? isoToDate(user.dataDesligamento) : "",
      observacoesPessoais: user.observacoesPessoais || ""
    });
    setUserModalTab("geral");
    setIsAddModalOpen(true);
  }

  function openAddModal() {
    setEditingUser(null);
    resetUserForm();
    setEmailError("");
    setUserModalTab("geral");
    setIsAddModalOpen(true);
  }

  // ─── CARGOS STATE ────────────────────────────────────
  const [cargos, setCargos] = useState<any[]>([]);
  const [editingCargo, setEditingCargo] = useState<any>(null);
  const [cargoForm, setCargoForm] = useState({ nome: "", slug: "", descricao: "", permissoes: {} as Permissoes });
  const [isCargoModalOpen, setIsCargoModalOpen] = useState(false);
  const [loadingCargos, setLoadingCargos] = useState(false);

  async function fetchCargos() {
    const res = await fetch("/api/configuracoes/cargos");
    if (res.ok) setCargos(await res.json());
  }

  // Carrega cargos e garante que os 3 padrão existam
  useEffect(() => {
    (async () => {
      await fetch("/api/configuracoes/cargos/seed", { method: "POST" });
      fetchCargos();
    })();
  }, []);

  useEffect(() => {
    if (tab === "cargos") {
      fetchCargos();
    }
  }, [tab]);



  async function seedCargos() {
    setLoadingCargos(true);
    await fetch("/api/configuracoes/cargos/seed", { method: "POST" });
    await fetchCargos();
    setLoadingCargos(false);
  }

  function openCargoModal(cargo?: any) {
    if (cargo) {
      setEditingCargo(cargo);
      setCargoForm({ nome: cargo.nome, slug: cargo.slug, descricao: cargo.descricao || "", permissoes: cargo.permissoes || {} });
    } else {
      setEditingCargo(null);
      const defaultPerms: Permissoes = {};
      MODULOS_SISTEMA.forEach(m => { defaultPerms[m.slug] = false; });
      setCargoForm({ nome: "", slug: "", descricao: "", permissoes: defaultPerms });
    }
    setIsCargoModalOpen(true);
  }

  async function handleSaveCargo() {
    setSaving(true);
    try {
      if (editingCargo) {
        const res = await fetch("/api/configuracoes/cargos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingCargo.id, nome: cargoForm.nome, descricao: cargoForm.descricao, permissoes: cargoForm.permissoes })
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
        alert("\u2705 Cargo atualizado!");
      } else {
        const res = await fetch("/api/configuracoes/cargos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cargoForm)
        });
        if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
        alert("\u2705 Cargo criado!");
      }
      setIsCargoModalOpen(false);
      await fetchCargos();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCargo(id: string) {
    if (!confirm("Tem certeza que deseja excluir este cargo?")) return;
    const res = await fetch("/api/configuracoes/cargos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    });
    if (!res.ok) { const e = await res.json(); alert(e.error); return; }
    await fetchCargos();
  }

  function togglePerm(slug: string) {
    setCargoForm(prev => ({
      ...prev,
      permissoes: { ...prev.permissoes, [slug]: !prev.permissoes[slug] }
    }));
  }

  function toggleAll(checked: boolean) {
    const p: Permissoes = {};
    MODULOS_SISTEMA.forEach(m => { p[m.slug] = checked; });
    setCargoForm(prev => ({ ...prev, permissoes: p }));
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <aside className="w-full md:w-64 space-y-1">
          <h1 className="text-xl font-bold mb-6 px-3 flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-400" /> Configurações
          </h1>
          <TabButton active={tab === "empresa"} onClick={() => setTab("empresa")} icon={<Building2 />} label="Dados da Empresa" />
          <TabButton active={tab === "branding"} onClick={() => setTab("branding")} icon={<Palette />} label="Identidade Visual" />
          <TabButton active={tab === "usuarios"} onClick={() => setTab("usuarios")} icon={<Users />} label="Equipe & Acessos" />
          <TabButton active={tab === "cargos"} onClick={() => setTab("cargos")} icon={<Shield />} label="Cargos & Permissões" />
          <TabButton active={tab === "seguranca"} onClick={() => setTab("seguranca")} icon={<ShieldCheck />} label="Segurança" />
          <TabButton active={tab === "notificacoes"} onClick={() => setTab("notificacoes")} icon={<Bell />} label="Notificações" />
        </aside>

        {/* Content */}
        <main className="flex-1 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm min-h-[600px] flex flex-col">
          {tab === "empresa" && (
            <div className="p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold">Perfil da Empresa</h2>
                <p className="text-sm text-zinc-500">Gerencie as informações oficiais da sua organização.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Razão Social</label>
                  <input 
                    type="text" 
                    value={formEmpresa.nomeEmpresa} 
                    onChange={e => setFormEmpresa({...formEmpresa, nomeEmpresa: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Nome Fantasia</label>
                  <input 
                    type="text" 
                    value={formEmpresa.nomeFantasia} 
                    onChange={e => setFormEmpresa({...formEmpresa, nomeFantasia: e.target.value})}
                    className="w-full px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <button 
                  onClick={handleSaveEmpresa}
                  disabled={saving}
                  className="flex items-center gap-2 bg-brand hover:opacity-90 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-brand/20 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </div>
          )}

          {tab === "branding" && (
            <div className="p-8 space-y-8">
              <div>
                <h2 className="text-lg font-bold">Identidade Visual (White Label)</h2>
                <p className="text-sm text-zinc-500">Personalize a plataforma com a cara da sua marca.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Logotipo Principal</label>
                    <div className="flex items-center gap-6">
                      <label className="w-24 h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center overflow-hidden relative group cursor-pointer hover:border-brand transition-colors">
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleFileUpload}
                        />
                        {formEmpresa.logoUrl ? (
                          <img src={formEmpresa.logoUrl} className="w-full h-full object-contain p-2" alt="Logo" />
                        ) : (
                          <Upload className="w-6 h-6 text-zinc-400 group-hover:text-brand" />
                        )}
                      </label>
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                           <input 
                              type="text" 
                              placeholder="URL do Logotipo" 
                              value={formEmpresa.logoUrl}
                              onChange={e => setFormEmpresa({...formEmpresa, logoUrl: e.target.value})}
                              className="flex-1 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs"
                           />
                        </div>
                        <p className="text-[10px] text-zinc-500">Recomendado: PNG transparente, 512x512px.</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Cor da Marca (Primária)</label>
                    <div className="flex items-center gap-4">
                       <input 
                          type="color" 
                          value={formEmpresa.corPrimaria}
                          onChange={e => setFormEmpresa({...formEmpresa, corPrimaria: e.target.value})}
                          className="w-12 h-12 rounded-lg cursor-pointer border-none bg-transparent"
                       />
                       <div className="flex-1 px-4 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-mono">
                         {formEmpresa.corPrimaria.toUpperCase()}
                       </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Preview do Dashboard</label>
                   <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50 dark:bg-zinc-950 scale-90 origin-top shadow-inner">
                      <div className="flex items-center gap-2 mb-4">
                         <div className="w-6 h-6 rounded bg-zinc-200 dark:bg-zinc-800" />
                         <div className="w-20 h-2 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                         <div className="h-16 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2">
                            <div className="w-1/2 h-2 rounded bg-zinc-100 dark:bg-zinc-800 mb-1" />
                            <div className="w-3/4 h-3 rounded" style={{ backgroundColor: formEmpresa.corPrimaria }} />
                         </div>
                         <div className="h-16 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-2">
                            <div className="w-1/2 h-2 rounded bg-zinc-100 dark:bg-zinc-800 mb-1" />
                            <div className="w-3/4 h-3 rounded" style={{ backgroundColor: formEmpresa.corPrimaria }} />
                         </div>
                      </div>
                      <div className="w-full h-8 rounded-lg text-white text-[10px] flex items-center justify-center font-bold" style={{ backgroundColor: formEmpresa.corPrimaria }}>
                         BOTAO DE EXEMPLO
                      </div>
                   </div>
                </div>
              </div>

              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
                <button 
                  onClick={handleSaveEmpresa}
                  disabled={saving}
                  className="flex items-center gap-2 bg-brand hover:opacity-90 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg shadow-brand/20 transition disabled:opacity-50"
                >
                  <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Aplicar Branding"}
                </button>
              </div>
            </div>
          )}

          {tab === "usuarios" && (
            <div className="p-8">
               <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold">Gestão de Equipe</h2>
                  <p className="text-sm text-zinc-500">Convide e gerencie as permissões dos seus colaboradores.</p>
                </div>
                <button 
                  onClick={openAddModal}
                  className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-xs font-bold transition hover:opacity-80"
                >
                   <Users className="w-4 h-4" /> Novo Membro
                </button>
              </div>

              <div className="space-y-3">
                {usuarios.map((u: any) => (
                  <div key={u.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold">
                          {u.nome?.substring(0,2).toUpperCase()}
                       </div>
                       <div>
                          <p className="text-sm font-bold">{u.nome}</p>
                          <p className="text-xs text-zinc-500">{u.email}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${!u.ativo ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}>
                          {!u.ativo ? "INATIVO" : u.perfilSlug}
                       </span>
                       <button 
                         onClick={() => openEditModal(u)}
                         className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition text-zinc-400"
                       >
                          <Pencil className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "cargos" && (
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold">Cargos & Permissões</h2>
                  <p className="text-sm text-zinc-500">Defina os cargos e controle o acesso de cada um aos módulos do sistema.</p>
                </div>
                <div className="flex gap-2">
                  {cargos.length === 0 && (
                    <button onClick={seedCargos} disabled={loadingCargos}
                      className="flex items-center gap-2 bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-lg text-xs font-bold transition hover:opacity-80 disabled:opacity-50">
                      {loadingCargos ? "Criando..." : "Gerar Cargos Padrão"}
                    </button>
                  )}
                  <button onClick={() => openCargoModal()}
                    className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-xs font-bold transition hover:opacity-80">
                    <Plus className="w-4 h-4" /> Novo Cargo
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {cargos.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-brand" />
                      </div>
                      <div>
                        <p className="text-sm font-bold flex items-center gap-2">
                          {c.nome}
                          {c.isSistema && <span className="text-[9px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-bold">SISTEMA</span>}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {Object.values(c.permissoes || {}).filter(Boolean).length} de {MODULOS_SISTEMA.length} módulos · {c._count?.usuarios || 0} usuário(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openCargoModal(c)}
                        className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition text-zinc-400">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!c.isSistema && (
                        <button onClick={() => handleDeleteCargo(c.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition text-zinc-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {cargos.length === 0 && (
                  <p className="text-center text-zinc-400 py-12">Nenhum cargo criado. Clique em &quot;Gerar Cargos Padrão&quot; para começar.</p>
                )}
              </div>
            </div>
          )}

          {tab === "seguranca" && (
            <div className="p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold">Segurança</h2>
                <p className="text-sm text-zinc-500">Configurações de segurança e políticas de acesso.</p>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-brand" />
                    <div>
                      <p className="text-sm font-bold">Autenticação de Dois Fatores (2FA)</p>
                      <p className="text-xs text-zinc-500">Adiciona uma camada extra de proteção ao login.</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded">EM BREVE</span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-brand" />
                    <div>
                      <p className="text-sm font-bold">Política de Senhas</p>
                      <p className="text-xs text-zinc-500">Senha mínima: 8 caracteres com letra maiúscula, número e símbolo.</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded">ATIVO</span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-brand" />
                    <div>
                      <p className="text-sm font-bold">Sessões Ativas</p>
                      <p className="text-xs text-zinc-500">Sessões expiram automaticamente após 24h de inatividade.</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded">ATIVO</span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-brand" />
                    <div>
                      <p className="text-sm font-bold">Isolamento Multi-Tenant</p>
                      <p className="text-xs text-zinc-500">Dados completamente isolados entre empresas. Nenhum dado é compartilhado.</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold bg-green-100 dark:bg-green-900/30 text-green-600 px-2 py-0.5 rounded">ATIVO</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "notificacoes" && (
            <div className="p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold">Notificações</h2>
                <p className="text-sm text-zinc-500">Configure como e quando receber alertas do sistema.</p>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-brand" />
                      <div>
                        <p className="text-sm font-bold">Novo Lead Cadastrado</p>
                        <p className="text-xs text-zinc-500">Receba alerta quando um novo lead entrar no funil.</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded">EM BREVE</span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-brand" />
                      <div>
                        <p className="text-sm font-bold">Contrato Aprovado</p>
                        <p className="text-xs text-zinc-500">Seja notificado quando um contrato mudar de status.</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded">EM BREVE</span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-brand" />
                      <div>
                        <p className="text-sm font-bold">Meta Atingida</p>
                        <p className="text-xs text-zinc-500">Receba parabéns automáticos ao bater metas mensais.</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded">EM BREVE</span>
                  </div>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-brand" />
                      <div>
                        <p className="text-sm font-bold">Resumo Diário por E-mail</p>
                        <p className="text-xs text-zinc-500">Relatório resumido dos leads e contratos do dia.</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded">EM BREVE</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL DE CARGO */}
      {isCargoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">{editingCargo ? `Editar: ${editingCargo.nome}` : "Novo Cargo"}</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Nome do Cargo</label>
                  <input type="text" value={cargoForm.nome}
                    onChange={e => setCargoForm({...cargoForm, nome: e.target.value})}
                    className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
                    placeholder="Ex: Supervisor" />
                </div>
                <div>
                  <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Slug (identificador)</label>
                  <input type="text" value={cargoForm.slug} disabled={!!editingCargo}
                    onChange={e => setCargoForm({...cargoForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')})}
                    className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm disabled:opacity-50"
                    placeholder="ex: supervisor" />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Permissões de Acesso</label>
                  {!(editingCargo?.isSistema && editingCargo?.slug === "admin") && (
                    <div className="flex gap-2">
                      <button onClick={() => toggleAll(true)} className="text-[10px] font-bold text-brand hover:underline">Marcar Todos</button>
                      <span className="text-zinc-300">|</span>
                      <button onClick={() => toggleAll(false)} className="text-[10px] font-bold text-zinc-400 hover:underline">Desmarcar Todos</button>
                    </div>
                  )}
                </div>

                {(() => {
                  const grupos = [...new Set(MODULOS_SISTEMA.map(m => m.grupo))];
                  const isAdminSistema = editingCargo?.isSistema && editingCargo?.slug === "admin";
                  return grupos.map(grupo => (
                    <div key={grupo} className="mb-4">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mb-2">{grupo}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {MODULOS_SISTEMA.filter(m => m.grupo === grupo).map(mod => (
                          <label key={mod.slug}
                            className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition ${
                              cargoForm.permissoes[mod.slug]
                                ? 'bg-brand/5 border-brand/30 text-brand font-medium'
                                : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 text-zinc-500'
                            } ${isAdminSistema ? 'opacity-60 cursor-not-allowed' : 'hover:border-brand/50'}`}>
                            <input type="checkbox" checked={!!cargoForm.permissoes[mod.slug]}
                              disabled={isAdminSistema}
                              onChange={() => togglePerm(mod.slug)}
                              className="w-4 h-4 rounded text-brand border-zinc-300" />
                            {mod.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setIsCargoModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition">Cancelar</button>
              <button onClick={handleSaveCargo} disabled={saving || !cargoForm.nome || !cargoForm.slug}
                className="bg-brand text-white px-5 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition shadow-lg shadow-brand/20">
                <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Cargo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE USUÁRIOS — EXPANDIDO */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-2">{editingUser ? `Editar: ${editingUser.nome}` : "Novo Membro"}</h3>
            <div className="flex gap-1 mb-5 border-b border-zinc-100 dark:border-zinc-800 pb-2 overflow-x-auto">
              {([
                { key: "geral", label: "Geral" },
                ...(editingUser ? [
                  { key: "pessoal", label: "Pessoal" },
                  { key: "endereco", label: "Endereço" },
                  { key: "bancario", label: "Bancário" },
                  { key: "contratacao", label: "Contratação" },
                ] : [])
              ] as {key: string; label: string}[]).map(t => (
                <button key={t.key} onClick={() => setUserModalTab(t.key)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition whitespace-nowrap ${userModalTab === t.key ? 'bg-brand/10 text-brand' : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200'}`}>{t.label}</button>
              ))}
            </div>
            <div className="space-y-4">
              {userModalTab === "geral" && (<>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Nome *</label>
                    <input type="text" value={userForm.nome} onChange={e => setUserForm({...userForm, nome: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" placeholder="Nome completo" /></div>
                  <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">E-mail {editingUser ? '' : '*'}</label>
                    <input type="email" value={userForm.email} disabled={!!editingUser} onChange={e => { setUserForm({...userForm, email: e.target.value}); setEmailError(""); }} onBlur={() => !editingUser && userForm.email && validateEmail(userForm.email)} className={`w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border rounded-lg text-sm disabled:opacity-60 disabled:cursor-not-allowed ${emailError ? 'border-red-400' : 'border-zinc-200 dark:border-zinc-800'}`} placeholder="email@empresa.com" />
                    {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
                    {editingUser && <p className="text-[10px] text-zinc-400 mt-1">E-mail não pode ser alterado (vinculado à autenticação)</p>}
                    {!editingUser && !emailError && <p className="text-[10px] text-zinc-500 mt-1">Senha provisória: <strong>Mudar@123</strong></p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Perfil de Acesso</label>
                    <select value={userForm.perfilSlug} onChange={e => setUserForm({...userForm, perfilSlug: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm">
                      {cargos.length > 0 ? cargos.map((c: any) => (
                        <option key={c.slug} value={c.slug}>{c.nome}</option>
                      )) : (<>
                        <option value="vendedor">Vendedor</option><option value="gerente">Gerente</option><option value="admin">Administrador</option>
                      </>)}
                    </select></div>
                  <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Telefone</label>
                    <input type="text" value={userForm.telefone} onChange={e => setUserForm({...userForm, telefone: maskPhone(e.target.value)})} maxLength={15} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" placeholder="(99) 99999-9999" /></div>
                </div>
                {editingUser && (<div className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <input type="checkbox" checked={userForm.ativo} onChange={e => setUserForm({...userForm, ativo: e.target.checked})} id="ativo2" className="w-4 h-4 rounded border-zinc-300" />
                  <label htmlFor="ativo2" className="text-sm font-medium cursor-pointer">Usuário Ativo no Sistema</label>
                </div>)}
              </>)}
              {userModalTab === "pessoal" && (<div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">CPF</label><input type="text" value={userForm.cpf} onChange={e => setUserForm({...userForm, cpf: maskCPF(e.target.value)})} maxLength={14} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" placeholder="000.000.000-00" /></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">RG</label><input type="text" value={userForm.rg} onChange={e => setUserForm({...userForm, rg: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Órgão Emissor</label><input type="text" value={userForm.orgaoEmissor} onChange={e => setUserForm({...userForm, orgaoEmissor: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" placeholder="SSP/SC" /></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Nascimento</label><input type="text" value={userForm.dataNascimento} onChange={e => setUserForm({...userForm, dataNascimento: maskDate(e.target.value)})} maxLength={10} className={`w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border rounded-lg text-sm ${userForm.dataNascimento.length === 10 && !isValidDate(userForm.dataNascimento) ? 'border-red-400' : 'border-zinc-200 dark:border-zinc-800'}`} placeholder="dd/mm/aaaa" />
                  {userForm.dataNascimento.length === 10 && !isValidDate(userForm.dataNascimento) && <p className="text-xs text-red-500 mt-1">Data inválida</p>}
                </div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Gênero</label><select value={userForm.genero} onChange={e => setUserForm({...userForm, genero: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"><option value="">Selecionar</option><option value="M">Masculino</option><option value="F">Feminino</option><option value="Outro">Outro</option></select></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Estado Civil</label><select value={userForm.estadoCivil} onChange={e => setUserForm({...userForm, estadoCivil: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"><option value="">Selecionar</option><option value="Solteiro(a)">Solteiro(a)</option><option value="Casado(a)">Casado(a)</option><option value="Divorciado(a)">Divorciado(a)</option><option value="Viúvo(a)">Viúvo(a)</option></select></div>
                <div className="col-span-2"><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Time que Torce ⚽</label><input type="text" value={userForm.timeFavorito} onChange={e => setUserForm({...userForm, timeFavorito: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" placeholder="Ex: Flamengo, Corinthians..." /></div>
              </div>)}
              {userModalTab === "endereco" && (<div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">CEP</label><input type="text" value={userForm.cep} onChange={e => setUserForm({...userForm, cep: maskCEP(e.target.value)})} onBlur={async () => { const addr = await fetchCEP(userForm.cep); if (addr) setUserForm(prev => ({...prev, logradouro: addr.logradouro, bairro: addr.bairro, cidade: addr.cidade, uf: addr.uf})); }} maxLength={9} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" placeholder="00000-000" /></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">UF</label><input type="text" value={userForm.uf} maxLength={2} onChange={e => setUserForm({...userForm, uf: e.target.value.toUpperCase()})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" placeholder="SC" /></div>
                <div className="col-span-2"><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Logradouro</label><input type="text" value={userForm.logradouro} onChange={e => setUserForm({...userForm, logradouro: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" placeholder="Rua, Avenida..." /></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Número</label><input type="text" value={userForm.numero} onChange={e => setUserForm({...userForm, numero: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Complemento</label><input type="text" value={userForm.complemento} onChange={e => setUserForm({...userForm, complemento: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Bairro</label><input type="text" value={userForm.bairro} onChange={e => setUserForm({...userForm, bairro: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Cidade</label><input type="text" value={userForm.cidade} onChange={e => setUserForm({...userForm, cidade: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" /></div>
              </div>)}
              {userModalTab === "bancario" && (<div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Banco</label><input type="text" value={userForm.bancoNome} onChange={e => setUserForm({...userForm, bancoNome: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" placeholder="Ex: Banco do Brasil" /></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Tipo Conta</label><select value={userForm.bancoTipoConta} onChange={e => setUserForm({...userForm, bancoTipoConta: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"><option value="">Selecionar</option><option value="corrente">Corrente</option><option value="poupanca">Poupança</option></select></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Agência</label><input type="text" value={userForm.bancoAgencia} onChange={e => setUserForm({...userForm, bancoAgencia: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Conta</label><input type="text" value={userForm.bancoConta} onChange={e => setUserForm({...userForm, bancoConta: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" /></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Tipo PIX</label><select value={userForm.tipoChavePix} onChange={e => setUserForm({...userForm, tipoChavePix: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"><option value="">Selecionar</option><option value="cpf">CPF</option><option value="email">E-mail</option><option value="telefone">Telefone</option><option value="aleatoria">Aleatória</option></select></div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Chave PIX</label><input type="text" value={userForm.chavePix} onChange={e => setUserForm({...userForm, chavePix: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm" /></div>
              </div>)}
              {userModalTab === "contratacao" && (<div className="grid grid-cols-2 gap-4">
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Data Contratação</label><input type="text" value={userForm.dataContratacao} onChange={e => setUserForm({...userForm, dataContratacao: maskDate(e.target.value)})} maxLength={10} className={`w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border rounded-lg text-sm ${userForm.dataContratacao.length === 10 && !isValidDate(userForm.dataContratacao) ? 'border-red-400' : 'border-zinc-200 dark:border-zinc-800'}`} placeholder="dd/mm/aaaa" />
                  {userForm.dataContratacao.length === 10 && !isValidDate(userForm.dataContratacao) && <p className="text-xs text-red-500 mt-1">Data inválida</p>}
                </div>
                <div><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Data Desligamento</label><input type="text" value={userForm.dataDesligamento} onChange={e => setUserForm({...userForm, dataDesligamento: maskDate(e.target.value)})} maxLength={10} className={`w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border rounded-lg text-sm ${userForm.dataDesligamento.length === 10 && !isValidDate(userForm.dataDesligamento) ? 'border-red-400' : 'border-zinc-200 dark:border-zinc-800'}`} placeholder="dd/mm/aaaa" />
                  {userForm.dataDesligamento.length === 10 && !isValidDate(userForm.dataDesligamento) && <p className="text-xs text-red-500 mt-1">Data inválida</p>}
                </div>
                <div className="col-span-2"><label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Observações</label><textarea value={userForm.observacoesPessoais} rows={4} onChange={e => setUserForm({...userForm, observacoesPessoais: e.target.value})} className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm resize-none" placeholder="Anotações sobre o colaborador..." /></div>
              </div>)}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setIsAddModalOpen(false); setEditingUser(null); setEmailError(""); }}
                className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition">Cancelar</button>
              <button onClick={handleSaveUsuario} disabled={saving || !userForm.nome || !userForm.email}
                className="bg-brand text-white px-5 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition shadow-lg shadow-brand/20">
                <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar Membro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
        active 
        ? "bg-brand/10 text-brand dark:bg-brand/20 dark:text-brand" 
        : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
    >
      <span className={active ? "text-brand" : "text-zinc-400"}>{icon}</span>
      {label}
    </button>
  );
}
