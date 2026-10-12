import { EvaluationEditor } from "@/components/evaluaciones/EvaluationEditor";
import { defaultExamSchedule } from "@/lib/schemas/examSchema";

export const dynamic = "force-dynamic";

export default function CreateEvaluationPage() {
  return <EvaluationEditor initialSchedule={defaultExamSchedule()} />;
}
