import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  try {
    const sessao = await getSessionEmpresa();

    // Busca os dados de branding da empresa
    const empresa = await prisma.empresa.findUnique({
      where: { id: sessao.empresaId },
      select: { corPrimaria: true, logoUrl: true, nomeFantasia: true }
    });

    const corBrand = empresa?.corPrimaria || "#7c3aed";

  return (
    <div className="min-h-screen flex" style={{ "--brand-primary": corBrand } as any}>
      <aside className="hidden md:flex w-60 flex-col border-r border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-950/60 backdrop-blur">
        <div className="px-5 py-6">
          <Link href="/" className="flex items-center gap-2">
            {empresa?.logoUrl ? (
              <img src={empresa.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
            ) : (
              <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: corBrand }}>
                {sessao.nomeEmpresa?.substring(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">{empresa?.nomeFantasia || sessao.nomeEmpresa}</p>
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
  } catch (err: any) {
    if (err.message && err.message.includes("NEXT_REDIRECT")) {
      throw err; // Allow redirect to work
    }
    return (
      <div className="min-h-screen bg-zinc-950 p-8 text-red-500 font-mono">
        <h1>ERRO INTERNO DETECTADO (Layout):</h1>
        <pre>{err.message || String(err)}</pre>
        <pre className="text-xs opacity-50 mt-4">{err.stack}</pre>
      </div>
    );
  }
}
