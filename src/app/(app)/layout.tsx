import Link from "next/link";
import { UserMenu } from "@/components/layout/UserMenu";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { getSessionEmpresa } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { temPermissao, PERMISSOES_ADMIN, PERMISSOES_GERENTE, PERMISSOES_VENDEDOR, type Permissoes } from "@/lib/permissions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  try {
    const sessao = await getSessionEmpresa();

    // Busca os dados de branding da empresa
    const empresa = await prisma.empresa.findUnique({
      where: { id: sessao.empresaId },
      select: { corPrimaria: true, logoUrl: true, nomeFantasia: true }
    });

    // Busca as permissões do cargo do usuário
    const perfil = await prisma.usuarioPerfil.findFirst({
      where: { authUserId: sessao.userId },
      include: { cargo: { select: { permissoes: true } } }
    });

    // Resolve permissões: cargo > fallback perfilSlug
    let permissoes: Permissoes;
    if (perfil?.cargo?.permissoes && typeof perfil.cargo.permissoes === "object") {
      permissoes = perfil.cargo.permissoes as Permissoes;
    } else if (sessao.perfilSlug === "admin") {
      permissoes = PERMISSOES_ADMIN;
    } else if (sessao.perfilSlug === "gerente") {
      permissoes = PERMISSOES_GERENTE;
    } else {
      permissoes = PERMISSOES_VENDEDOR;
    }

    const corBrand = empresa?.corPrimaria || "#7c3aed";

  return (
    <div className="min-h-screen flex" style={{ "--brand-primary": corBrand } as any}>
      <aside className="hidden md:flex h-screen sticky top-0 w-64 flex-col border-r border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-xl shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-50">
        <div className="px-6 py-6 mb-2">
          <Link href="/mesa" className="flex items-center gap-3 group">
            {empresa?.logoUrl ? (
              <img src={empresa.logoUrl} alt="Logo" className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
            ) : (
              <div className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-bold shadow-md transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3" style={{ backgroundColor: corBrand }}>
                {sessao.nomeEmpresa?.substring(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col justify-center">
              <p className="font-bold text-[15px] tracking-tight text-zinc-800 dark:text-zinc-100">{empresa?.nomeFantasia || sessao.nomeEmpresa}</p>
              <div className="flex items-center mt-0.5">
                <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-brand bg-brand/10 dark:bg-brand/20 px-1.5 py-0.5 rounded-full" style={{ color: 'var(--brand-primary)' }}>
                  v2 alpha
                </span>
              </div>
            </div>
          </Link>
        </div>

        <SidebarNav permissoes={permissoes} />

        <div className="mt-auto px-3 pb-4">
          <UserMenu 
            nomeUsuario={sessao.nomeUsuario} 
            nomeEmpresa={sessao.nomeEmpresa} 
            email={sessao.email} 
          />
        </div>
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
