export function ReportSkeleton() {
  return (
    <div className="space-y-5" role="status" aria-label="Cargando reporte">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="h-80 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}
