"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { FormFieldError } from "@/components/forms/FormFieldError";
import { ExamBasicInfoFields } from "@/components/forms/ExamBasicInfoFields";
import { ExamSettingsSidebar } from "@/components/forms/ExamSettingsSidebar";
import { examCategoriesMock, bancoPreguntasMock } from "@/lib/db-mock";
import { TipoPregunta } from "@/types/index";
import { guardarEvaluacionCompleta } from "@/services/api/evaluaciones.api";
import { useGetComisionesDocente } from "@/hooks/useDocentes";
import { getUserErrorMessage } from "@/lib/errors";
import { toGuardarEvaluacionPayload } from "@/lib/exam-form";
import {
  defaultExamSchedule,
  examFormSchema,
  type ExamFormValues,
  type ExamQuestionGroup,
} from "@/lib/schemas/examSchema";
import { validationErrorsFromZod } from "@/lib/form-validation";

function TrashIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function CrearExamenPage() {
  const router = useRouter();
  const { types, securityMeasures } = examCategoriesMock;
  const [initialSchedule] = useState(defaultExamSchedule);
  const ahoraLocal = new Date(
    new Date().getTime() - new Date().getTimezoneOffset() * 60000,
  )
    .toISOString()
    .slice(0, 16);
  const maxDate = `${new Date().getFullYear() + 10}-12-31T23:59`;

  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(false);
  const [erroresValidacion, setErroresValidacion] = useState<string[]>([]); // 👈 Estado para el panel de errores
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{
    variant: "error" | "success" | "info";
    message: string;
  } | null>(null);

  const legajoDocente = session?.user?.identificadorInstitucional
    ? Number(session.user.identificadorInstitucional)
    : 0;
  const { data: comisiones, isLoading: cargandoComisiones } =
    useGetComisionesDocente(legajoDocente);

  const [idMateriaDivision, setIdMateriaDivision] = useState<string>("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [duracionMinutos, setDuracionMinutos] = useState("90");
  const [cantidadIntentos, setCantidadIntentos] = useState<string>("1");
  const [fechaInicio, setFechaInicio] = useState(initialSchedule.fechaInicio);
  const [fechaFin, setFechaFin] = useState(initialSchedule.fechaFin);

  const [selectedFormat, setSelectedFormat] = useState("mixed");
  const [securityConfig, setSecurityConfig] = useState<Record<string, boolean>>(
    securityMeasures.reduce(
      (acc, curr) => ({ ...acc, [curr.id]: curr.default }),
      {},
    ),
  );

  const [preguntas, setPreguntas] = useState<ExamQuestionGroup[]>([
    {
      id: 1,
      tituloReferencia: "Grupo o eje conceptual 1 (Ej: Derivadas)",
      variantes: [
        {
          id: "v1",
          enunciado: "Calcule la derivada de f(x) = 3x^2...",
          tipo: "mc",
          opciones: [],
        },
      ],
    },
  ]);

  const handleToggleSecurity = (id: string) => {
    setSecurityConfig((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAgregarPreguntaBase = () => {
    setPreguntas((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        tituloReferencia: `Nueva Pregunta Estructural ${prev.length + 1}`,
        variantes: [
          { id: `v-${Date.now()}`, enunciado: "", tipo: "mc", opciones: [] },
        ],
      },
    ]);
  };

  const handleAgregarVariante = (preguntaId: number) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === preguntaId
          ? {
              ...p,
              variantes: [
                ...p.variantes,
                {
                  id: `v-${Date.now()}`,
                  enunciado: "",
                  tipo: "mc",
                  opciones: [],
                },
              ],
            }
          : p,
      ),
    );
  };

  const handleRemoveGrupo = (preguntaId: number) => {
    setPreguntas((prev) => prev.filter((p) => p.id !== preguntaId));
  };

  const handleRemoveVariante = (preguntaId: number, varianteId: string) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === preguntaId
          ? {
              ...p,
              variantes: p.variantes.filter((v) => v.id !== varianteId),
            }
          : p,
      ),
    );
  };

  const handleRemoveOpcion = (
    preguntaId: number,
    varianteId: string,
    opcionIdx: number,
  ) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === preguntaId
          ? {
              ...p,
              variantes: p.variantes.map((v) =>
                v.id === varianteId
                  ? {
                      ...v,
                      opciones: v.opciones?.filter(
                        (_, idx) => idx !== opcionIdx,
                      ),
                    }
                  : v,
              ),
            }
          : p,
      ),
    );
  };

  const handleModificarEjeConceptual = (preguntaId: number, texto: string) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === preguntaId ? { ...p, tituloReferencia: texto } : p,
      ),
    );
  };

  const handleModificarEnunciado = (
    preguntaId: number,
    varianteId: string,
    texto: string,
  ) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === preguntaId
          ? {
              ...p,
              variantes: p.variantes.map((v) =>
                v.id === varianteId ? { ...v, enunciado: texto } : v,
              ),
            }
          : p,
      ),
    );
  };

  const handleModificarTipo = (
    preguntaId: number,
    varianteId: string,
    nuevoTipo: TipoPregunta,
  ) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === preguntaId
          ? {
              ...p,
              variantes: p.variantes.map((v) =>
                v.id === varianteId
                  ? {
                      ...v,
                      tipo: nuevoTipo,
                      opciones:
                        nuevoTipo === "mc" || nuevoTipo === "vf"
                          ? []
                          : undefined,
                    }
                  : v,
              ),
            }
          : p,
      ),
    );
  };

  const handleAgregarOpcion = (preguntaId: number, varianteId: string) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === preguntaId
          ? {
              ...p,
              variantes: p.variantes.map((v) =>
                v.id === varianteId
                  ? {
                      ...v,
                      opciones: [
                        ...(v.opciones || []),
                        { texto: "", esCorrecta: false },
                      ],
                    }
                  : v,
              ),
            }
          : p,
      ),
    );
  };

  const handleModificarOpcion = (
    preguntaId: number,
    varianteId: string,
    opcionIdx: number,
    campo: "texto" | "esCorrecta",
    valor: string | boolean,
  ) => {
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === preguntaId
          ? {
              ...p,
              variantes: p.variantes.map((v) =>
                v.id === varianteId
                  ? {
                      ...v,
                      opciones: v.opciones?.map((op, idx) =>
                        idx === opcionIdx
                          ? { ...op, [campo]: valor }
                          : campo === "esCorrecta" && valor === true
                            ? { ...op, esCorrecta: false }
                            : op,
                      ),
                    }
                  : v,
              ),
            }
          : p,
      ),
    );
  };

  const handleImportarDelBanco = (
    preguntaId: number,
    consignaTexto: string,
    tipo: string,
  ) => {
    const tipoMapeado =
      tipo === "choice" ? "mc" : tipo === "text" ? "abierta" : "code";
    setPreguntas((prev) =>
      prev.map((p) =>
        p.id === preguntaId
          ? {
              ...p,
              variantes: [
                ...p.variantes,
                {
                  id: `v-${Date.now()}`,
                  enunciado: consignaTexto,
                  tipo: tipoMapeado,
                  opciones: tipoMapeado === "mc" ? [] : undefined,
                },
              ],
            }
          : p,
      ),
    );
    setFeedback({
      variant: "success",
      message: "Consigna reutilizada e importada desde el Banco de EXAMIO.",
    });
  };

  const currentForm = (): ExamFormValues => ({
    titulo,
    descripcion,
    idMateriaDivision,
    duracionMinutos,
    cantidadIntentos,
    fechaInicio,
    fechaFin,
    preguntas,
  });

  const validateField = (field: string) => {
    const result = examFormSchema.safeParse(currentForm());
    const errors = result.success ? {} : validationErrorsFromZod(result.error.issues);
    setFieldErrors((current) => {
      const next = { ...current };
      if (errors[field]) next[field] = errors[field];
      else delete next[field];
      return next;
    });
  };

  const handleGuardarExamenCompleto = async () => {
    setErroresValidacion([]); // Limpiamos errores previos
    const validation = examFormSchema.safeParse(currentForm());
    if (!validation.success) {
      const errors = validationErrorsFromZod(validation.error.issues);
      setFieldErrors(errors);
      setErroresValidacion([...new Set(validation.error.issues.map((issue) => issue.message))]);
      // Hacemos un scroll suave arriba de todo para que el usuario note el banner inmediatamente
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const recursosPermitidos = Object.keys(securityConfig)
        .filter((key) => securityConfig[key])
        .map((key) => securityMeasures.find((m) => m.id === key)?.label)
        .filter((label): label is string => Boolean(label))
        .join(", ");
    const payload = toGuardarEvaluacionPayload(
      validation.data,
      recursosPermitidos,
    );

    try {
      setIsPending(true);
      await guardarEvaluacionCompleta(payload);
      router.push("/profesor");
    } catch (error: unknown) {
      setErroresValidacion([
        getUserErrorMessage(error, "No se pudo guardar el examen."),
      ]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-8 antialiased pb-16">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-200/60 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight sm:text-3xl">
            Configurar Nueva Evaluación
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Diseño de consignas aleatorias con banco de preguntas.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={() => router.push("/profesor")}
            className="bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2.5 text-xs font-semibold rounded-xl hover:bg-slate-200"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleGuardarExamenCompleto}
            disabled={isPending}
            className="bg-indigo-600 text-white px-5 py-2.5 text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50"
          >
            {isPending ? "Guardando..." : "Guardar y Publicar Examen"}
          </Button>
        </div>
      </div>

      {feedback && (
        <FeedbackMessage
          variant={feedback.variant}
          message={feedback.message}
        />
      )}

      {/* 🚨 PANEL DE ERRORES ESTILIZADO CON TAILWIND 🚨 */}
      {erroresValidacion.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 shadow-sm animate-fade-in">
          <div className="flex items-start gap-3">
            <span className="text-lg select-none">⚠️</span>
            <div className="space-y-1 w-full">
              <h4 className="text-sm font-bold text-red-800 tracking-tight">
                Revisá los parámetros del examen antes de continuar:
              </h4>
              <ul className="list-disc list-inside text-xs text-red-700 font-medium space-y-1 pt-1">
                {erroresValidacion.map((error, idx) => (
                  <li key={`${idx}-${error}`} className="leading-relaxed">{error}</li>
                ))}
              </ul>
            </div>
            <button 
              onClick={() => setErroresValidacion([])}
              className="text-red-400 hover:text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-lg hover:bg-red-100 transition-colors shrink-0"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <ExamBasicInfoFields
            title={titulo}
            description={descripcion}
            errors={fieldErrors}
            onTitleChange={setTitulo}
            onDescriptionChange={setDescripcion}
            onBlur={validateField}
          />

          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5 mb-4">
              🎛️ Formato del examen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {types.map((type) => {
                const isSelected = selectedFormat === type.id;
                return (
                  <div
                    key={type.id}
                    onClick={() => setSelectedFormat(type.id)}
                    className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-200 flex gap-3 ${isSelected ? "border-indigo-600 bg-indigo-50/40 shadow-sm" : "border-slate-200 bg-white hover:bg-slate-50/50"}`}
                  >
                    <span className="text-xl select-none">{type.icon}</span>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">
                        {type.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 leading-normal mt-0.5">
                        {type.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 tracking-tight">
                Estructura de Preguntas y Variantes
              </h3>
              <Button
                onClick={handleAgregarPreguntaBase}
                className="bg-slate-900 text-white text-xs font-semibold py-2 px-3 rounded-xl hover:bg-slate-800"
              >
                + Añadir Pregunta Estructural
              </Button>
            </div>

            {preguntas.map((p, groupIndex) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.01)] space-y-4"
              >
                <div className="flex items-start justify-between bg-slate-50 border border-slate-100 -mx-6 -mt-6 p-4 rounded-t-2xl">
                  <div className="w-2/3">
                    <input
                      type="text"
                      aria-label={`Título del grupo ${p.id}`}
                      value={p.tituloReferencia}
                      onChange={(e) =>
                        handleModificarEjeConceptual(p.id, e.target.value)
                      }
                      onBlur={() => validateField(`preguntas.${groupIndex}.tituloReferencia`)}
                      aria-invalid={Boolean(fieldErrors[`preguntas.${groupIndex}.tituloReferencia`])}
                      aria-describedby={fieldErrors[`preguntas.${groupIndex}.tituloReferencia`] ? `group-${p.id}-error` : undefined}
                      className="w-full rounded border-none bg-transparent px-2 py-0.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                    />
                    <FormFieldError
                      id={`group-${p.id}-error`}
                      message={fieldErrors[`preguntas.${groupIndex}.tituloReferencia`]}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                      Pregunta {p.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveGrupo(p.id)}
                      aria-label={`Eliminar grupo ${p.id}`}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {p.variantes.map((variante, idx) => (
                    <div
                      key={variante.id}
                      className="border-l-2 border-slate-200 pl-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs font-bold text-slate-400">
                          Variante Alternativa {idx + 1} (Aleatoria)
                        </span>
                        <div className="flex items-center gap-2">
                          <select
                            aria-label={`Tipo de la variante ${idx + 1}`}
                            value={variante.tipo}
                            onChange={(e) =>
                              handleModificarTipo(
                                p.id,
                                variante.id,
                                e.target.value as TipoPregunta,
                              )
                            }
                            className="text-xs font-semibold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="mc">Multiple Choice</option>
                            <option value="abierta">
                              A Desarrollar / Ensayo
                            </option>
                            <option value="code">Programación / SQL</option>
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveVariante(p.id, variante.id)
                            }
                            aria-label={`Eliminar variante ${idx + 1}`}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        placeholder="Escribí el enunciado de la consigna..."
                        value={variante.enunciado}
                        onChange={(e) =>
                          handleModificarEnunciado(
                            p.id,
                            variante.id,
                            e.target.value,
                          )
                        }
                        onBlur={() => validateField(`preguntas.${groupIndex}.variantes.${idx}.enunciado`)}
                        aria-invalid={Boolean(fieldErrors[`preguntas.${groupIndex}.variantes.${idx}.enunciado`])}
                        aria-describedby={fieldErrors[`preguntas.${groupIndex}.variantes.${idx}.enunciado`] ? `variant-${variante.id}-error` : undefined}
                        className="block w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all resize-none"
                      />
                      <FormFieldError
                        id={`variant-${variante.id}-error`}
                        message={fieldErrors[`preguntas.${groupIndex}.variantes.${idx}.enunciado`]}
                      />

                      {(variante.tipo === "mc" || variante.tipo === "vf") && (
                        <div className="mt-3 pl-2 space-y-2 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                              Opciones de Respuesta
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleAgregarOpcion(p.id, variante.id)
                              }
                              className="text-[10px] font-black text-indigo-600 hover:underline"
                            >
                              + Añadir Opción
                            </button>
                          </div>
                          {(variante.opciones || []).map((opcion, opIdx) => (
                            <div
                              key={opIdx}
                              className="flex items-center gap-3"
                            >
                              <input
                                type="radio"
                                aria-label={`Marcar opción ${opIdx + 1} como correcta`}
                                name={`correcta-${variante.id}`}
                                checked={opcion.esCorrecta}
                                onChange={(e) =>
                                  handleModificarOpcion(
                                    p.id,
                                    variante.id,
                                    opIdx,
                                    "esCorrecta",
                                    e.target.checked,
                                  )
                                }
                                className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                              />
                              <div className="flex-1">
                                <input
                                  type="text"
                                  aria-label={`Texto de la opción ${opIdx + 1}`}
                                  placeholder={`Opción ${opIdx + 1}...`}
                                  value={opcion.texto}
                                  onChange={(e) =>
                                    handleModificarOpcion(
                                      p.id,
                                      variante.id,
                                      opIdx,
                                      "texto",
                                      e.target.value,
                                    )
                                  }
                                  onBlur={() => validateField(`preguntas.${groupIndex}.variantes.${idx}.opciones.${opIdx}.texto`)}
                                  aria-invalid={Boolean(fieldErrors[`preguntas.${groupIndex}.variantes.${idx}.opciones.${opIdx}.texto`])}
                                  aria-describedby={fieldErrors[`preguntas.${groupIndex}.variantes.${idx}.opciones.${opIdx}.texto`] ? `option-${variante.id}-${opIdx}-error` : undefined}
                                  className="block w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-200 text-slate-700 font-medium"
                                />
                                <FormFieldError
                                  id={`option-${variante.id}-${opIdx}-error`}
                                  message={fieldErrors[`preguntas.${groupIndex}.variantes.${idx}.opciones.${opIdx}.texto`]}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveOpcion(p.id, variante.id, opIdx)
                                }
                                aria-label={`Eliminar opción ${opIdx + 1}`}
                                className="text-slate-400 hover:text-red-500 p-1"
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          ))}
                          <FormFieldError
                            id={`options-${variante.id}-error`}
                            message={fieldErrors[`preguntas.${groupIndex}.variantes.${idx}.opciones`]}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  <FormFieldError
                    id={`group-${p.id}-variants-error`}
                    message={fieldErrors[`preguntas.${groupIndex}.variantes`]}
                  />
                </div>

                <div className="flex items-center gap-2 pt-2 justify-between border-t border-slate-100 mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400 font-medium">
                      Reutilizar:
                    </span>
                    {bancoPreguntasMock.map((bancoItem) => (
                      <button
                        key={bancoItem.id}
                        type="button"
                        onClick={() =>
                          handleImportarDelBanco(
                            p.id,
                            bancoItem.text,
                            bancoItem.type,
                          )
                        }
                        className="text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition-colors"
                        title={bancoItem.text}
                      >
                        📥 {bancoItem.topic}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAgregarVariante(p.id)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 py-1 px-2.5 rounded-lg hover:bg-indigo-50 transition-colors"
                  >
                    + Agregar Variante Aleatoria
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <ExamSettingsSidebar
          duration={duracionMinutos}
          attempts={cantidadIntentos}
          startDate={fechaInicio}
          endDate={fechaFin}
          commissionId={idMateriaDivision}
          commissions={comisiones ?? []}
          loadingCommissions={cargandoComisiones}
          minDate={ahoraLocal}
          maxDate={maxDate}
          errors={fieldErrors}
          securityMeasures={securityMeasures}
          securityConfig={securityConfig}
          onDurationChange={setDuracionMinutos}
          onAttemptsChange={setCantidadIntentos}
          onStartDateChange={setFechaInicio}
          onEndDateChange={setFechaFin}
          onCommissionChange={setIdMateriaDivision}
          onToggleSecurity={handleToggleSecurity}
          onBlur={validateField}
        />
      </div>
    </div>
  );
}
