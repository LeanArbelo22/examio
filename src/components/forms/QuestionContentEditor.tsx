import type { ReactNode } from "react";
import { FormFieldError } from "@/components/forms/FormFieldError";
import type { ExamQuestionVariant } from "@/lib/schemas/examSchema";
import { normalizeQuestionConfiguration } from "@/lib/question-configuration";
import type {
  EstrategiaCorreccion,
  ModoJustificacion,
  TipoPregunta,
  TratamientoJustificacion,
} from "@/types";

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export function QuestionContentEditor({
  value,
  label,
  fieldPrefix,
  errors = {},
  onChange,
  onBlur,
  onRemove,
  actions,
}: {
  value: ExamQuestionVariant;
  label: string;
  fieldPrefix: string;
  errors?: Record<string, string>;
  onChange: (value: ExamQuestionVariant) => void;
  onBlur?: (field: string) => void;
  onRemove?: () => void;
  actions?: ReactNode;
}) {
  const field = (name: string) => (fieldPrefix ? `${fieldPrefix}.${name}` : name);
  const enunciadoError = errors[field("enunciado")];
  const opcionesError = errors[field("opciones")];
  const estrategiaError = errors[field("estrategiaCorreccion")];
  const tratamientoError = errors[field("tratamientoJustificacion")];
  const safeId = value.id.replace(/[^a-zA-Z0-9_-]/g, "-");
  const configuration = normalizeQuestionConfiguration(value.tipo, value);

  const changeType = (tipo: TipoPregunta) => {
    const configuration = normalizeQuestionConfiguration(tipo, value);
    if (tipo === "vf") {
      onChange({
        ...value,
        ...configuration,
        tipo,
        opciones: [
          { texto: "Verdadero", esCorrecta: true },
          { texto: "Falso", esCorrecta: false },
        ],
      });
      return;
    }
    onChange({
      ...value,
      ...configuration,
      tipo,
      opciones: tipo === "mc" || tipo === "multiple" ? [] : undefined,
    });
  };

  const changeJustification = (modoJustificacion: ModoJustificacion) => {
    onChange({
      ...value,
      ...normalizeQuestionConfiguration(value.tipo, {
        ...value,
        modoJustificacion,
      }),
    });
  };

  return (
    <fieldset className="space-y-3 border-l-2 border-slate-200 pl-4">
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-500">{label}</span>
        <div className="flex items-center gap-2">
          {actions}
          <label className="sr-only" htmlFor={`question-type-${safeId}`}>
            Tipo de {label.toLowerCase()}
          </label>
          <select
            id={`question-type-${safeId}`}
            value={value.tipo}
            onChange={(event) => changeType(event.target.value as TipoPregunta)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="mc">Selección única</option>
            <option value="multiple">Selección múltiple</option>
            <option value="vf">Verdadero / Falso</option>
            <option value="abierta">A desarrollar</option>
            <option value="code">Programación / SQL</option>
          </select>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Eliminar ${label.toLowerCase()}`}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>

      <div>
        <label className="sr-only" htmlFor={`question-statement-${safeId}`}>
          Enunciado de {label.toLowerCase()}
        </label>
        <textarea
          id={`question-statement-${safeId}`}
          rows={3}
          maxLength={100_000}
          placeholder="Escribí el enunciado de la consigna..."
          value={value.enunciado}
          onChange={(event) =>
            onChange({ ...value, enunciado: event.target.value })
          }
          onBlur={() => onBlur?.(field("enunciado"))}
          aria-invalid={Boolean(enunciadoError)}
          aria-describedby={
            enunciadoError ? `question-statement-${safeId}-error` : undefined
          }
          className="block w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        />
        <FormFieldError
          id={`question-statement-${safeId}-error`}
          message={enunciadoError}
        />
      </div>

      {(value.tipo === "mc" ||
        value.tipo === "multiple" ||
        value.tipo === "vf") && (
        <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Opciones de respuesta
            </span>
            {(value.tipo === "mc" || value.tipo === "multiple") && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...value,
                    opciones: [
                      ...(value.opciones ?? []),
                      { texto: "", esCorrecta: false },
                    ],
                  })
                }
                className="rounded-lg px-2 py-1 text-[11px] font-black text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                + Añadir opción
              </button>
            )}
          </div>

          {(value.opciones ?? []).map((option, optionIndex) => {
            const optionPath = field(`opciones.${optionIndex}.texto`);
            const optionError = errors[optionPath];
            return (
              <div key={`${safeId}-${option.persistedId ?? optionIndex}`}>
                <div className="flex items-center gap-3">
                  <input
                    type={value.tipo === "multiple" ? "checkbox" : "radio"}
                    name={`correct-${safeId}`}
                    aria-label={`Marcar opción ${optionIndex + 1} como correcta`}
                    checked={option.esCorrecta}
                    onChange={() => {
                      const multiple = value.tipo === "multiple";
                      onChange({
                        ...value,
                        opciones: (value.opciones ?? []).map((item, index) => ({
                          ...item,
                          esCorrecta: multiple
                            ? index === optionIndex
                              ? !item.esCorrecta
                              : item.esCorrecta
                            : index === optionIndex,
                        })),
                      });
                    }}
                    className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <input
                    type="text"
                    maxLength={500}
                    value={option.texto}
                    readOnly={value.tipo === "vf"}
                    aria-label={`Texto de la opción ${optionIndex + 1}`}
                    onChange={(event) =>
                      onChange({
                        ...value,
                        opciones: (value.opciones ?? []).map((item, index) =>
                          index === optionIndex
                            ? { ...item, texto: event.target.value }
                            : item,
                        ),
                      })
                    }
                    onBlur={() => onBlur?.(optionPath)}
                    aria-invalid={Boolean(optionError)}
                    aria-describedby={
                      optionError
                        ? `question-option-${safeId}-${optionIndex}-error`
                        : undefined
                    }
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 read-only:bg-slate-100"
                  />
                  {(value.tipo === "mc" || value.tipo === "multiple") && (
                    <button
                      type="button"
                      onClick={() =>
                        onChange({
                          ...value,
                          opciones: (value.opciones ?? []).filter(
                            (_, index) => index !== optionIndex,
                          ),
                        })
                      }
                      aria-label={`Eliminar opción ${optionIndex + 1}`}
                      className="rounded-lg p-1 text-slate-400 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <TrashIcon />
                    </button>
                  )}
                </div>
                <FormFieldError
                  id={`question-option-${safeId}-${optionIndex}-error`}
                  message={optionError}
                />
              </div>
            );
          })}
          <FormFieldError
            id={`question-options-${safeId}-error`}
            message={opcionesError}
          />
        </div>
      )}

      {(value.tipo === "mc" ||
        value.tipo === "multiple" ||
        value.tipo === "vf") && (
        <div className="grid gap-3 rounded-xl border border-slate-100 bg-white p-3 md:grid-cols-2">
          {value.tipo === "multiple" && (
            <div className="md:col-span-2">
              <label
                htmlFor={`question-correction-${safeId}`}
                className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500"
              >
                Forma de corrección
              </label>
              <select
                id={`question-correction-${safeId}`}
                value={configuration.estrategiaCorreccion}
                onChange={(event) =>
                  onChange({
                    ...value,
                    estrategiaCorreccion: event.target
                      .value as EstrategiaCorreccion,
                  })
                }
                aria-invalid={Boolean(estrategiaError)}
                aria-describedby={
                  estrategiaError
                    ? `question-correction-${safeId}-error`
                    : undefined
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="exacta">Coincidencia exacta</option>
                <option value="parcial_sin_penalizacion">
                  Puntaje parcial sin penalización
                </option>
                <option value="parcial_penalizada">
                  Puntaje parcial con descuento
                </option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Define cómo se valora una respuesta que selecciona solo parte de las opciones correctas.
              </p>
              <FormFieldError
                id={`question-correction-${safeId}-error`}
                message={estrategiaError}
              />
            </div>
          )}

          <div>
            <label
              htmlFor={`question-justification-${safeId}`}
              className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500"
            >
              Justificación del alumno
            </label>
            <select
              id={`question-justification-${safeId}`}
              value={configuration.modoJustificacion}
              onChange={(event) =>
                changeJustification(event.target.value as ModoJustificacion)
              }
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="sin_justificacion">No solicitar</option>
              <option value="opcional">Opcional</option>
              <option value="obligatoria">Obligatoria</option>
            </select>
            <p className="mt-1 text-xs text-slate-500">
              Podés pedir que el alumno explique por qué eligió su respuesta.
            </p>
          </div>

          {configuration.modoJustificacion !== "sin_justificacion" && (
            <div>
              <label
                htmlFor={`question-justification-treatment-${safeId}`}
                className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500"
              >
                Uso de la justificación
              </label>
              <select
                id={`question-justification-treatment-${safeId}`}
                value={configuration.tratamientoJustificacion}
                onChange={(event) =>
                  onChange({
                    ...value,
                    tratamientoJustificacion: event.target
                      .value as TratamientoJustificacion,
                  })
                }
                aria-invalid={Boolean(tratamientoError)}
                aria-describedby={
                  tratamientoError
                    ? `question-treatment-${safeId}-error`
                    : undefined
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="informativa">Solo informativa</option>
                <option value="revision_manual">Requiere revisión docente</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                La revisión docente permite considerar la explicación al corregir.
              </p>
              <FormFieldError
                id={`question-treatment-${safeId}-error`}
                message={tratamientoError}
              />
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}
