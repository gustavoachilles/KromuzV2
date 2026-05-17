"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

export function UserMenu({ 
  nomeUsuario, 
  nomeEmpresa, 
  email 
}: { 
  nomeUsuario: string | null;
  nomeEmpresa: string;
  email: string;
}) {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const inicial = nomeUsuario ? nomeUsuario.charAt(0).toUpperCase() : email.charAt(0).toUpperCase();

  return (
    <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800/80">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center font-bold text-sm shrink-0">
          {inicial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
            {nomeUsuario || email}
          </p>
          <p className="text-xs text-zinc-500 truncate">{nomeEmpresa}</p>
        </div>
      </div>
      <button
        onClick={handleSignOut}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-red-600 dark:hover:text-red-400 transition"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    </div>
  );
}
