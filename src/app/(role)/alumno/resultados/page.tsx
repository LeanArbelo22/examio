import { Suspense } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { StudentHistoryWorkspace } from "./StudentHistoryWorkspace";

export default function ResultadosPage() {
  return (
    <Suspense fallback={<LoadingState message="Cargando historial..." />}>
      <StudentHistoryWorkspace />
    </Suspense>
  );
}
