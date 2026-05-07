import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { getSessionEmpresa } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await getSessionEmpresa();

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-60 flex-col border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 backdrop-blur">
        <div className="px-5 py-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center text-white font-bold">
              K
            </div>
            <div>
              <p className="font-semibold">Kromuz</p>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">v2 alpha</p>
            </div>
          </Link>
        </div>

        <SidebarNav />

        <UserMenu 
          nomeUsuario={sessao.nomeUsuario} 
          nomeEmpresa={sessao.nomeEmpresa} 
          email={sessao.email} 
        />
      </aside>

      <main className="flex-1 min-w-0 h-screen overflow-y-auto">{children}</main>
    </div>
  );
}
