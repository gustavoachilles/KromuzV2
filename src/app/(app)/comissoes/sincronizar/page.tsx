import { SincronizarClient } from "./SincronizarClient";

export const metadata = {
  title: "Sincronizar Tabelas - Kromuz",
  description: "Importe tabelas de comissão automaticamente via Bevi",
};

export default function SincronizarPage() {
  return <SincronizarClient />;
}
