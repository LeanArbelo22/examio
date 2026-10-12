import { Suspense } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { QuestionBankWorkspace } from "@/components/question-bank/QuestionBankWorkspace";

export default function QuestionBankPage() {
  return (
    <Suspense fallback={<LoadingState message="Cargando banco de preguntas..." />}>
      <QuestionBankWorkspace />
    </Suspense>
  );
}
