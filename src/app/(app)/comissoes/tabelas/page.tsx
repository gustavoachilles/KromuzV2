import { TabelasComissaoClient } from "./TabelasComissaoClient";

export const metadata = {
  title: "Tabelas de Comissão - Kromuz",
  description: "Gerencie tabelas de comissão por banco, convênio e produto.",
};

export default function TabelasComissaoPage() {
  return <TabelasComissaoClient />;
}
