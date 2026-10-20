import type { ReporteGrupoItem, ReportePreguntaItem } from "@/types";

type RankingItem = ReportePreguntaItem | ReporteGrupoItem;

interface ContentPerformanceRankingsProps {
  kind: "preguntas" | "grupos";
  lowestScores: RankingItem[];
  longestTimes: RankingItem[];
  onSelectQuestion?: (question: ReportePreguntaItem) => void;
}

function isQuestion(item: RankingItem): item is ReportePreguntaItem {
  return "enunciado" in item;
}

function title(item: RankingItem) {
  return isQuestion(item) ? item.enunciado : item.grupo || "Grupo sin título";
}

function percentage(value: number | null) {
  return value === null ? "Sin puntaje" : `${Number(value).toLocaleString("es-AR", { maximumFractionDigits: 2 })}%`;
}

function duration(milliseconds: number | null) {
  if (milliseconds === null) return "Sin tiempo registrado";
  const seconds = milliseconds / 1000;
  if (seconds < 60) return `${seconds.toLocaleString("es-AR", { maximumFractionDigits: 1 })} s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return remainder ? `${minutes} min ${remainder} s` : `${minutes} min`;
}

function RankingList({
  items,
  metric,
  onSelectQuestion,
}: {
  items: RankingItem[];
  metric: "score" | "time";
  onSelectQuestion?: (question: ReportePreguntaItem) => void;
}) {
  const availableItems = items.filter((item) =>
    metric === "score"
      ? item.porcentajePuntajePromedio !== null
      : item.tiempoPromedioMilisegundos !== null,
  );

  if (availableItems.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
        No hay datos suficientes para este ranking.
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {availableItems.map((item, index) => {
        const content = (
          <>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-black text-indigo-700">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block line-clamp-2 text-sm font-bold text-slate-900">
                {title(item)}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {item.muestrasConfirmadas.toLocaleString("es-AR")} respuestas calificadas
                {"cantidadVariantes" in item
                  ? ` · ${item.cantidadVariantes} variante${item.cantidadVariantes === 1 ? "" : "s"}`
                  : item.grupo
                    ? ` · ${item.grupo}`
                    : ""}
              </span>
            </span>
            <strong className="shrink-0 text-sm text-slate-900">
              {metric === "score"
                ? percentage(item.porcentajePuntajePromedio)
                : duration(item.tiempoPromedioMilisegundos)}
            </strong>
          </>
        );

        return (
          <li key={isQuestion(item) ? item.claveContenido : item.idGrupoPregunta}>
            {isQuestion(item) && onSelectQuestion ? (
              <button
                type="button"
                onClick={() => onSelectQuestion(item)}
                className="flex w-full items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-indigo-200 hover:bg-indigo-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
                {content}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function ContentPerformanceRankings({
  kind,
  lowestScores,
  longestTimes,
  onSelectQuestion,
}: ContentPerformanceRankingsProps) {
  const label = kind === "preguntas" ? "preguntas" : "grupos";

  return (
    <section aria-labelledby={`${kind}-rankings-title`}>
      <div className="mb-3">
        <h2 id={`${kind}-rankings-title`} className="text-base font-black text-slate-900">
          Rankings de {label}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Las primeras cinco posiciones se calculan sobre todo el conjunto que coincide con los filtros.
        </p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="text-sm font-black text-slate-900">Menor puntaje promedio</h3>
          <p className="mb-3 mt-1 text-xs text-slate-500">
            Ayuda a identificar contenidos que podrían necesitar revisión.
          </p>
          <RankingList
            items={lowestScores}
            metric="score"
            onSelectQuestion={onSelectQuestion}
          />
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          <h3 className="text-sm font-black text-slate-900">Mayor tiempo promedio</h3>
          <p className="mb-3 mt-1 text-xs text-slate-500">
            El tiempo aporta contexto, pero no demuestra dificultad ni comprensión.
          </p>
          <RankingList
            items={longestTimes}
            metric="time"
            onSelectQuestion={onSelectQuestion}
          />
        </article>
      </div>
    </section>
  );
}
