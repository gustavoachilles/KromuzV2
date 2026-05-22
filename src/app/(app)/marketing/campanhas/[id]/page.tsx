import { DashboardCampanhaClient } from "./DashboardCampanhaClient";

export const metadata = { title: "Dashboard Campanha | Kromuz" };

export default function DashboardCampanhaPage({ params }: { params: { id: string } }) {
  return <DashboardCampanhaClient id={params.id} />;
}
