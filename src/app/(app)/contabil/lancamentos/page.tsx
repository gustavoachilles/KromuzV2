import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { temPermissao } from "@/lib/permissions";
import { LancamentosClient } from "./LancamentosClient";

export const metadata = { title: "Contas a Pagar / Receber | Kromuz" };

export default async function LancamentosPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  if (!temPermissao(null, "contabil", sessao.perfilSlug)) redirect("/mesa");

  return <LancamentosClient />;
}
