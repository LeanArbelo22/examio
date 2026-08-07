export function LoadingState({ message = "Cargando..." }: { message?: string }) {
  return (
    <div role="status" aria-live="polite" className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm font-medium text-slate-500">
      {message}
    </div>
  );
}
