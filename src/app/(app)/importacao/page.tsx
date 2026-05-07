import { getSessionEmpresa } from "@/lib/session";
import { ImportacaoClient } from "./ImportacaoClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Importar Clientes | Kromuz",
  description: "Importe leads em massa via CSV ou planilha.",
};

export default async function ImportacaoPage() {
  await getSessionEmpresa(); // auth guard
  return <ImportacaoClient />;
}
