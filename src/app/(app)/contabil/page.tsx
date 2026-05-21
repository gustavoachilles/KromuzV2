import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { temPermissao } from "@/lib/permissions";
import { Calculator } from "lucide-react";

export const metadata = { title: "Contábil & Fiscal | Kromuz" };

export default async function ContabilPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  
  if (!temPermissao(null, "contabil", sessao.perfilSlug)) {
    redirect("/mesa");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-black">
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-brand mb-1">
              <Calculator className="h-5 w-5" />
              <span className="text-xs uppercase tracking-widest font-semibold">Módulo de Gestão</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Contábil & Fiscal</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-1 max-w-2xl">
              Gerencie a parte contábil, notas fiscais e conciliações (Em breve).
            </p>
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center py-32 text-zinc-400 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-6">
            <Calculator className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
          </div>
          <h2 className="text-xl font-light text-zinc-500 dark:text-zinc-400">Módulo em Desenvolvimento</h2>
          <p className="text-sm mt-2 max-w-sm text-center">
            A área de gestão contábil e emissão fiscal está sendo construída.
          </p>
        </div>
      </div>
    </div>
  );
}
