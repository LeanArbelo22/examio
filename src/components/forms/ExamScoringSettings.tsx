import { FormFieldError } from "@/components/forms/FormFieldError";
import { scoreInputToCents } from "@/lib/exam-scoring";
import type {
  EscalaCalificacion,
  ModoPuntaje,
} from "@/types";

interface ExamScoringSettingsProps {
  scale: EscalaCalificacion;
  passingGrade: string;
  scoreMode: ModoPuntaje;
  showScoreToStudent: boolean;
  autoGradeClosedQuestions: boolean;
  groupScores: (string | undefined)[];
  errors: Record<string, string>;
  scaleChangeNotice?: string | null;
  onScaleChange: (scale: EscalaCalificacion) => void;
  onPassingGradeChange: (value: string) => void;
  onScoreModeChange: (mode: ModoPuntaje) => void;
  onShowScoreToStudentChange: (value: boolean) => void;
  onAutoGradeClosedQuestionsChange: (value: boolean) => void;
  onBlur: (field: string) => void;
}

export function ExamScoringSettings({
  scale,
  passingGrade,
  scoreMode,
  showScoreToStudent,
  autoGradeClosedQuestions,
  groupScores,
  errors,
  scaleChangeNotice,
  onScaleChange,
  onPassingGradeChange,
  onScoreModeChange,
  onShowScoreToStudentChange,
  onAutoGradeClosedQuestionsChange,
  onBlur,
}: ExamScoringSettingsProps) {
  const totalCents = groupScores.reduce(
    (total, value) => total + (scoreInputToCents(value) ?? 0),
    0,
  );
  const assignedGroups = groupScores.filter(
    (value) => scoreInputToCents(value) !== null,
  ).length;
  const total = totalCents / 100;
  const totalMatches =
    assignedGroups === groupScores.length && totalCents === scale * 100;
  const fieldClass =
    "block w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100";

  return (
    <section
      className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
      aria-labelledby="exam-scoring-title"
    >
      <div>
        <h2 id="exam-scoring-title" className="text-base font-bold text-slate-800">
          Calificación
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Definí la escala, el criterio de aprobación y cómo se distribuye el puntaje.
        </p>
      </div>

      {scaleChangeNotice && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900"
        >
          {scaleChangeNotice}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="exam-scoring-scale"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Escala de calificación
          </label>
          <select
            id="exam-scoring-scale"
            value={scale}
            onChange={(event) =>
              onScaleChange(Number(event.target.value) as EscalaCalificacion)
            }
            className={fieldClass}
          >
            <option value={10}>0 a 10</option>
            <option value={100}>0 a 100</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="exam-passing-grade"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
          >
            Nota de aprobación
          </label>
          <input
            id="exam-passing-grade"
            type="number"
            min="0"
            max={scale}
            step="0.01"
            value={passingGrade}
            onChange={(event) => onPassingGradeChange(event.target.value)}
            onBlur={() => onBlur("notaAprobacion")}
            onWheel={(event) => event.currentTarget.blur()}
            aria-invalid={Boolean(errors.notaAprobacion)}
            aria-describedby={
              errors.notaAprobacion ? "exam-notaAprobacion-error" : undefined
            }
            className={fieldClass}
          />
          <FormFieldError
            id="exam-notaAprobacion-error"
            message={errors.notaAprobacion}
          />
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Distribución del puntaje
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <ScoreModeOption
            checked={scoreMode === "iguales"}
            label="Puntajes iguales"
            description="Examio distribuye la escala en centavos entre todos los grupos."
            onChange={() => onScoreModeChange("iguales")}
          />
          <ScoreModeOption
            checked={scoreMode === "personalizados"}
            label="Puntajes personalizados"
            description="Asignás el valor de cada grupo; la suma debe coincidir con la escala."
            onChange={() => onScoreModeChange("personalizados")}
          />
        </div>
      </fieldset>

      {scoreMode === "personalizados" && (
        <div
          className={`rounded-xl border px-3 py-2 text-xs font-semibold ${
            totalMatches
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          <p>
            Puntaje asignado: {total.toFixed(2)} de {scale.toFixed(2)} · {assignedGroups}
            /{groupScores.length} grupos configurados
          </p>
          <FormFieldError
            id="exam-custom-scores-error"
            message={errors.puntajesPersonalizados}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleOption
          checked={showScoreToStudent}
          label="Mostrar puntaje por pregunta"
          description="El alumno verá el máximo del grupo sorteado durante el examen."
          onChange={onShowScoreToStudentChange}
        />
        <ToggleOption
          checked={autoGradeClosedQuestions}
          label="Corregir cerradas automáticamente"
          description="Si se desactiva, las preguntas cerradas quedarán pendientes de corrección docente."
          onChange={onAutoGradeClosedQuestionsChange}
        />
      </div>
    </section>
  );
}

function ScoreModeOption({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 focus-within:ring-2 focus-within:ring-indigo-500">
      <input
        type="radio"
        name="score-mode"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 border-slate-300 text-indigo-600"
      />
      <span>
        <span className="block text-sm font-bold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}

function ToggleOption({
  checked,
  label,
  description,
  onChange,
}: {
  checked: boolean;
  label: string;
  description: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 focus-within:ring-2 focus-within:ring-indigo-500">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
      />
      <span>
        <span className="block text-sm font-bold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}
