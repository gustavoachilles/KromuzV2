import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { temPermissao } from "@/lib/permissions";
import { RadarVencimentosClient } from "./RadarVencimentosClient";

export const metadata = { title: "Radar de Vencimentos | Kromuz" };

export default async function RadarPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  if (!temPermissao(null, "contabil", sessao.perfilSlug)) redirect("/mesa");
  return <RadarVencimentosClient />;
}
