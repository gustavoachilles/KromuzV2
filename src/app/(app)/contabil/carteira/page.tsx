import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { temPermissao } from "@/lib/permissions";
import { CarteiraGerencialClient } from "./CarteiraGerencialClient";

export const metadata = { title: "Carteira dos Vendedores | Kromuz" };

export default async function CarteiraPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  if (!temPermissao(null, "contabil", sessao.perfilSlug)) redirect("/mesa");

  return <CarteiraGerencialClient />;
}
