"use client";

import { RequestErrorState } from "@/components/ui/RequestErrorState";

export default function ProfesorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RequestErrorState
      error={error}
      fallback="No se pudo mostrar esta sección docente."
      onRetry={reset}
      showRetry
    />
  );
}
