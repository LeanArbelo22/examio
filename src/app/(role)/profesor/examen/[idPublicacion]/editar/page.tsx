import { notFound } from "next/navigation";
import { EvaluationEditor } from "@/components/evaluaciones/EvaluationEditor";

export default async function EditEvaluationDraftPage({
  params,
}: {
  params: Promise<{ idPublicacion: string }>;
}) {
  const { idPublicacion } = await params;
  const publicationId = Number(idPublicacion);
  if (!Number.isInteger(publicationId) || publicationId <= 0) notFound();
  return <EvaluationEditor idPublicacion={publicationId} />;
}
