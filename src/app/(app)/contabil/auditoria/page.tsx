import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { AuditoriaClient } from "./AuditoriaClient";

export const metadata = { title: "Auditoria | Kromuz" };

export default async function AuditoriaPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  if (!["dono", "admin"].includes(sessao.perfilSlug)) redirect("/mesa");
  return <AuditoriaClient />;
}
