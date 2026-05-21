import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { temPermissao } from "@/lib/permissions";
import { CategoriasClient } from "./CategoriasClient";

export const metadata = { title: "Plano de Contas | Kromuz" };

export default async function CategoriasPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  if (!temPermissao(null, "contabil", sessao.perfilSlug)) redirect("/mesa");
  return <CategoriasClient />;
}
