"use client";

import React, { useState } from "react";
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
  const [tab, setTab] = useState("empresa");
  const [saving, setSaving] = useState(false);
  
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
      window.location.reload();
    } catch (err) {
      alert("Erro ao salvar as configurações.");
    } finally {
      setSaving(false);
    }
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
                <button className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg text-xs font-bold transition">
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
                       <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                          {u.perfilSlug}
                       </span>
                       <button className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition text-zinc-400">
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
