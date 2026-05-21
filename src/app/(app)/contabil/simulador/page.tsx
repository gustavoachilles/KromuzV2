import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { temPermissao } from "@/lib/permissions";
import { SimuladorClient } from "./SimuladorClient";

export const metadata = { title: "Simulador Tributário | Kromuz" };

export default async function SimuladorPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  if (!temPermissao(null, "contabil", sessao.perfilSlug)) redirect("/mesa");
  return <SimuladorClient />;
}
