import { Button } from "./Button";

export function Pagination({
  page,
  totalPages,
  onPageChange,
  total,
  itemLabel,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  total?: number;
  itemLabel?: string;
}) {
  const safeTotalPages = Math.max(totalPages, 1);
  const safePage = Math.min(Math.max(page, 1), safeTotalPages);

  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500 shadow-sm"
    >
      <span>
        Página {safePage} de {safeTotalPages}
        {total !== undefined && itemLabel
          ? ` · ${total.toLocaleString("es-AR")} ${itemLabel}`
          : ""}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600"
        >
          Anterior
        </Button>
        <Button
          type="button"
          disabled={totalPages === 0 || safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600"
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
