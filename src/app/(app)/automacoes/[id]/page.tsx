import { WorkflowBuilder } from "./WorkflowBuilder";

export const metadata = { title: "Construtor Visual | Kromuz CRM" };

export default function WorkflowBuilderPage({ params }: { params: { id: string } }) {
  return <WorkflowBuilder id={params.id} />;
}
