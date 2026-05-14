"use client";

import React, { useState } from "react";
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
  Pencil
} from "lucide-react";

export function ConfiguracoesClient({ empresa, usuarios, bancos, sessao }: any) {
  const router = useRouter();
  const [tab, setTab] = useState("empresa");
  const [saving, setSaving] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const [userForm, setUserForm] = useState({
    nome: "",
    email: "",
    perfilSlug: "vendedor",
    ativo: true
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
        // PATCH
        const res = await fetch("/api/configuracoes/usuarios", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingUser.id,
            nome: userForm.nome,
            perfilSlug: userForm.perfilSlug,
            ativo: userForm.ativo
          })
        });
        if (!res.ok) {
           const err = await res.json();
           throw new Error(err.error || "Erro ao atualizar");
        }
        alert("✅ Membro atualizado com sucesso!");
      } else {
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
        alert("✅ Membro adicionado com sucesso!\nA senha provisória dele é: Mudar@123");
      }
      
      router.refresh();
      setIsAddModalOpen(false);
      setEditingUser(null);
      setUserForm({ nome: "", email: "", perfilSlug: "vendedor", ativo: true });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  function openEditModal(user: any) {
    setEditingUser(user);
    setUserForm({
      nome: user.nome || "",
      email: user.email || "",
      perfilSlug: user.perfilSlug || "vendedor",
      ativo: user.ativo
    });
    setIsAddModalOpen(true);
  }

  function openAddModal() {
    setEditingUser(null);
    setUserForm({ nome: "", email: "", perfilSlug: "vendedor", ativo: true });
    setIsAddModalOpen(true);
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
        </main>
      </div>

      {/* MODAL DE USUÁRIOS */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">{editingUser ? "Editar Membro" : "Novo Membro"}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Nome</label>
                <input 
                  type="text" 
                  value={userForm.nome}
                  onChange={e => setUserForm({...userForm, nome: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
                  placeholder="Nome do colaborador"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">E-mail</label>
                <input 
                  type="email" 
                  value={userForm.email}
                  disabled={!!editingUser}
                  onChange={e => setUserForm({...userForm, email: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm disabled:opacity-50"
                  placeholder="email@empresa.com"
                />
                {!editingUser && (
                  <p className="text-[10px] text-zinc-500 mt-1">
                    A senha provisória será <strong>Mudar@123</strong>
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Perfil de Acesso</label>
                <select 
                  value={userForm.perfilSlug}
                  onChange={e => setUserForm({...userForm, perfilSlug: e.target.value})}
                  className="w-full mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm"
                >
                  <option value="vendedor">Vendedor</option>
                  <option value="gerente">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              {editingUser && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <input 
                    type="checkbox" 
                    checked={userForm.ativo}
                    onChange={e => setUserForm({...userForm, ativo: e.target.checked})}
                    id="ativo"
                    className="w-4 h-4 text-brand rounded border-zinc-300"
                  />
                  <label htmlFor="ativo" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                    Usuário Ativo no Sistema
                  </label>
                </div>
              )}
            </div>
            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => { setIsAddModalOpen(false); setEditingUser(null); }}
                className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveUsuario}
                disabled={saving || !userForm.nome || !userForm.email}
                className="bg-brand text-white px-5 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2 transition shadow-lg shadow-brand/20"
              >
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
