import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { temPermissao } from "@/lib/permissions";
import { DashboardClient } from "./DashboardClient";

export const metadata = { title: "Dashboard BI | Kromuz" };

export default async function DashboardPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  if (!temPermissao(null, "contabil", sessao.perfilSlug)) redirect("/mesa");
  return <DashboardClient />;
}
