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
    <div className="min-h-screen flex bg-zinc-50 dark:bg-zinc-950" style={{ "--brand-primary": corBrand } as any}>
      {/* Floating Dark Sidebar */}
      <aside className="dark hidden md:flex h-[calc(100vh-32px)] sticky top-4 left-4 ml-4 w-[260px] flex-col rounded-3xl bg-[#0a0a0a] border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-50 overflow-hidden text-zinc-100">
        
        {/* Glow effect in the background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand/20 to-transparent opacity-50 pointer-events-none" style={{ backgroundImage: `linear-gradient(to bottom, color-mix(in srgb, var(--brand-primary) 20%, transparent), transparent)` }} />

        <div className="px-6 py-8 relative z-10">
          <Link href="/mesa" className="flex items-center gap-3 group">
            {empresa?.logoUrl ? (
              <div className="bg-white p-1 rounded-xl shadow-lg">
                <img src={empresa.logoUrl} alt="Logo" className="h-8 w-auto object-contain transition-transform duration-300 group-hover:scale-105" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6 bg-gradient-to-br from-brand to-brand/60" style={{ backgroundImage: `linear-gradient(to bottom right, var(--brand-primary), color-mix(in srgb, var(--brand-primary) 50%, black))` }}>
                {sessao.nomeEmpresa?.substring(0, 1).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col justify-center">
              <p className="font-bold text-[16px] tracking-tight text-white">{empresa?.nomeFantasia || sessao.nomeEmpresa}</p>
              <div className="flex items-center mt-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-white bg-white/10 px-2 py-0.5 rounded-full border border-white/5 backdrop-blur-md">
                  v2 alpha
                </span>
              </div>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide relative z-10">
          <SidebarNav permissoes={permissoes} />
        </div>

        <div className="mt-auto p-4 relative z-10">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-1 backdrop-blur-md">
            <UserMenu 
              nomeUsuario={sessao.nomeUsuario} 
              nomeEmpresa={sessao.nomeEmpresa} 
              email={sessao.email} 
            />
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 h-screen overflow-y-auto pl-4">{children}</main>
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
