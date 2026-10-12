"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { LoadingState } from "@/components/ui/LoadingState";
import { RequestErrorState } from "@/components/ui/RequestErrorState";
import {
  useCrearEtiquetaBanco,
  useEtiquetasBanco,
} from "@/hooks/useBancoPreguntas";
import { getUserErrorMessage } from "@/lib/errors";

export function QuestionBankTagSelector({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (selected: number[]) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const tagsQuery = useEtiquetasBanco();
  const createTag = useCrearEtiquetaBanco();

  const submitTag = async () => {
    const normalized = name.trim();
    if (!normalized) return;
    try {
      setError(null);
      const created = await createTag.mutateAsync({ Nombre: normalized });
      onChange([...new Set([...selected, created.id])]);
      setName("");
    } catch (cause) {
      setError(getUserErrorMessage(cause, "No se pudo crear la etiqueta."));
    }
  };

  return (
    <section className="space-y-3" aria-labelledby="bank-tags-title">
      <div>
        <h2 id="bank-tags-title" className="text-sm font-bold text-slate-800">
          Etiquetas
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Ayudan a encontrar y reutilizar contenido más adelante.
        </p>
      </div>

      {tagsQuery.isLoading && <LoadingState message="Cargando etiquetas..." />}
      {tagsQuery.isError && (
        <RequestErrorState
          error={tagsQuery.error}
          fallback="No se pudieron cargar las etiquetas."
          onRetry={() => tagsQuery.refetch()}
          showRetry
        />
      )}
      {tagsQuery.data && (
        <div className="flex flex-wrap gap-2">
          {tagsQuery.data.map((tag) => {
            const checked = selected.includes(tag.id);
            return (
              <label
                key={tag.id}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-within:ring-2 focus-within:ring-indigo-500 ${
                  checked
                    ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() =>
                    onChange(
                      checked
                        ? selected.filter((id) => id !== tag.id)
                        : [...selected, tag.id],
                    )
                  }
                />
                {tag.nombre}
              </label>
            );
          })}
          {tagsQuery.data.length === 0 && (
            <p className="text-xs text-slate-500">Todavía no creaste etiquetas.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="new-bank-tag">
          Nueva etiqueta
        </label>
        <input
          id="new-bank-tag"
          value={name}
          maxLength={50}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void submitTag();
            }
          }}
          placeholder="Nueva etiqueta"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
        />
        <Button
          type="button"
          onClick={() => void submitTag()}
          disabled={!name.trim() || createTag.isPending}
          className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-bold text-indigo-700 disabled:opacity-50"
        >
          {createTag.isPending ? "Creando..." : "Crear etiqueta"}
        </Button>
      </div>
      {error && <FeedbackMessage variant="error" message={error} />}
    </section>
  );
}
