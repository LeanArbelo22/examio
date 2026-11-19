import { TeacherEvaluationsExplorer } from "@/components/profesor/TeacherEvaluationsExplorer";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/LoadingState";

export default function ProfesorPage() {
  return <Suspense fallback={<LoadingState message="Cargando actividades asignadas..." />}><TeacherEvaluationsExplorer /></Suspense>;
}
