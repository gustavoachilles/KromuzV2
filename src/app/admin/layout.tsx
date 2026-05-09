import React from "react";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Crown, Building2, CreditCard, LogOut, ChevronLeft } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessionEmpresa();
  
  // Verify Super Admin
  const usuario = await prisma.usuarioPerfil.findUnique({
    where: { id: sessao.userId }
  });

  if (!usuario?.isSuperAdmin) {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100">
      {/* Sidebar Super Admin */}
      <div className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-violet-400 font-bold tracking-tight">
            <Crown className="w-5 h-5" />
            KROMUZ <span className="text-zinc-500 font-normal">Super-Admin</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition">
            <Crown className="w-4 h-4" /> Dashboard (MRR)
          </Link>
          <Link href="/admin/empresas" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition">
            <Building2 className="w-4 h-4" /> Gestão de Corbans
          </Link>
          <Link href="/admin/planos" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition">
            <CreditCard className="w-4 h-4" /> Planos SaaS
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-300 transition">
            <ChevronLeft className="w-4 h-4" /> Voltar ao CRM
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-zinc-900">
        <div className="max-w-7xl mx-auto p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
