import { Suspense } from "react";
import { InstitutionalAnalyticsWorkspace } from "@/components/admin/InstitutionalAnalyticsWorkspace";

export default function AdminAnaliticaPage() {
  return (
    <Suspense
      fallback={
        <div
          className="h-96 animate-pulse rounded-2xl bg-slate-100"
          aria-label="Cargando seguimiento institucional"
        />
      }
    >
      <InstitutionalAnalyticsWorkspace />
    </Suspense>
  );
}
