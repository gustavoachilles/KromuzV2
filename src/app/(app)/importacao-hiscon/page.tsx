import { getSessionEmpresa } from "@/lib/session";
import { ImportacaoHisconClient } from "./ImportacaoHisconClient";

export const metadata = {
  title: "Importar Extrato INSS | Kromuz",
};

export default async function ImportacaoHisconPage() {
  await getSessionEmpresa();
  return <ImportacaoHisconClient />;
}
