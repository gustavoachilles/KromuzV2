import { redirect } from "next/navigation";
import { getSessionEmpresa } from "@/lib/session";
import { DashboardAtendimentoClient } from "./DashboardAtendimentoClient";

export const metadata = { title: "Dashboard Atendimento | Kromuz" };

export default async function DashboardAtendimentoPage() {
  const sessao = await getSessionEmpresa();
  if (!sessao) redirect("/");
  return <DashboardAtendimentoClient />;
}
