"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { examCategoriesMock, bancoPreguntasMock } from "@/lib/db-mock";
import { GuardarEvaluacionPayload, TipoPregunta } from "@/types/index";
import { guardarEvaluacionCompleta } from "@/services/api/evaluaciones.api";
import { useGetComisionesDocente } from "@/hooks/useDocentes";

interface VarianteOpcion {
  texto: string;
  esCorrecta: boolean;
}

interface Variante {
  id: string;
  enunciado: string;
  tipo: string;
  opciones?: VarianteOpcion[];
}

interface PreguntaEstructura {
  id: number;
  tituloReferencia: string;
  variantes: Variante[];
}

export default function CrearExamenPage() {
  const router = useRouter();
  const { types, securityMeasures } = examCategoriesMock;
  
  const { data: session } = useSession();
  const [isPending, setIsPending] = useState(false);
  const legajoDocente = session?.user?.identificadorInstitucional ? Number(session.user.identificadorInstitucional) : 0;
  const { data: comisiones, isLoading: cargandoComisiones } = useGetComisionesDocente(legajoDocente);

  const [idMateriaDivision, setIdMateriaDivision] = useState<string>("");
  const [duracionMinutos, setDuracionMinutos] = useState("90");
  const [cantidadIntentos, setCantidadIntentos] = useState<string>("1");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");

  const [selectedFormat, setSelectedFormat] = useState("mixed");
  const [securityConfig, setSecurityConfig] = useState<Record<string, boolean>>(
    securityMeasures.reduce(
      (acc, curr) => ({ ...acc, [curr.id]: curr.default }),
      {},
    ),
  );

  const [preguntas, setPreguntas] = useState<PreguntaEstructura[]>([
    {
      id: 1,
      tituloReferencia: "Eje conceptual 1 (Ej: Derivadas)",
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
    nuevoTipo: string,
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
    valor: any,
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
                  opciones:
                    tipoMapeado === "mc"
                      ? []
                      : undefined,
                },
              ],
            }
          : p,
      ),
    );
    alert(
      "Consigna reutilizada e importada con éxito desde el Banco de EXAMIO.",
    );
  };

  function validarExamen(): string[] {
    const errores: string[] = [];

    const idMateriaDivisionNum = Number(idMateriaDivision);
    if (!idMateriaDivision || !Number.isInteger(idMateriaDivisionNum) || idMateriaDivisionNum <= 0) {
      errores.push("Seleccioná una comisión institucional válida para publicar el examen.");
    }

    if (!fechaInicio) {
      errores.push("Configurá la fecha de apertura.");
    }
    if (!fechaFin) {
      errores.push("Configurá la fecha de cierre.");
    }
    if (fechaInicio && fechaFin && new Date(fechaFin) <= new Date(fechaInicio)) {
      errores.push("La fecha de cierre debe ser posterior a la fecha de apertura.");
    }

    const intentos = Number(cantidadIntentos);
    if (!cantidadIntentos || !Number.isInteger(intentos) || intentos < 1) {
      errores.push("La cantidad máxima de intentos debe ser un número entero mayor o igual a 1.");
    }

    preguntas.forEach((p, pi) => {
      if (!p.tituloReferencia || !p.tituloReferencia.trim()) {
        errores.push(`Pregunta ${pi + 1}: el eje conceptual no puede estar vacío.`);
      }

      p.variantes.forEach((v, vi) => {
        if (!v.enunciado || !v.enunciado.trim()) {
          errores.push(`Pregunta ${pi + 1}, Variante ${vi + 1}: el enunciado no puede estar vacío.`);
        }

        if (v.tipo === "mc" || v.tipo === "vf") {
          const opciones = v.opciones || [];

          if (opciones.length < 2) {
            errores.push(`Pregunta ${pi + 1}: debe tener al menos 2 opciones de respuesta.`);
          }

          const correctas = opciones.filter((o) => o.esCorrecta).length;
          if (correctas !== 1) {
            errores.push(`Pregunta ${pi + 1}: debes marcar exactamente una opción como la respuesta correcta.`);
          }

          opciones.forEach((o, oi) => {
            if (!o.texto || !o.texto.trim()) {
              errores.push(`Pregunta ${pi + 1}, Opción ${oi + 1}: el texto de la opción no puede estar vacío.`);
            }
          });
        }
      });
    });

    return errores;
  }

  const handleGuardarExamenCompleto = async () => {
    const idMateriaDivisionNum = Number(idMateriaDivision);

    const errores = validarExamen();
    if (errores.length > 0) {
      alert("Corregí los siguientes errores antes de guardar:\n\n• " + errores.join("\n• "));
      return;
    }

    const payload: GuardarEvaluacionPayload = {
      Titulo: selectedFormat === "mixed" ? "Evaluación Mixta Adaptativa" : `Evaluación de tipo ${selectedFormat}`,
      Descripcion: "Creado desde el configurador avanzado de cátedras de EXAMIO.",
      Tipo: "evaluacion",
      CantidadIntentosMaximos: Number(cantidadIntentos) || 1,
      FechaInicio: new Date(fechaInicio).toISOString(),
      FechaFin: new Date(fechaFin).toISOString(),
      IdMateriaDivision: idMateriaDivisionNum,
      DuracionMinutos: Number(duracionMinutos) || null,
      RecursosPermitidos: Object.keys(securityConfig)
        .filter((key) => securityConfig[key])
        .map((key) => securityMeasures.find((m) => m.id === key)?.label)
        .join(", "),
      GruposPreguntas: preguntas.map((p) => ({
        TituloReferencia: p.tituloReferencia,
        Variantes: p.variantes.map((v) => ({
          Enunciado: v.enunciado,
          Tipo: v.tipo as TipoPregunta,
          Opciones: v.opciones?.map((op) => ({
            Texto: op.texto,
            EsCorrecta: op.esCorrecta,
          })),
        })),
      })),
    };

    console.log("📦 Payload a enviar:", JSON.stringify(payload, null, 2));

    try {
      setIsPending(true);
      await guardarEvaluacionCompleta(payload);
      alert("¡Éxito! El examen se guardó y se publicó correctamente.");
      router.push("/profesor");
    } catch (err: any) {
      alert(err.message || "Error crítico al guardar el examen.");
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
            Diseño adaptativo de consignas dinámicas con banco de reactivos.
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
            disabled={isPending || preguntas.some((p) => p.variantes.some((v) => !v.enunciado))}
            className="bg-indigo-600 text-white px-5 py-2.5 text-xs font-bold rounded-xl hover:bg-indigo-700 shadow-sm transition-all disabled:opacity-50"
          >
            {isPending ? "Persistiendo en SQL..." : "Guardar y Publicar Examen"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5 mb-4">
              🎛️ Formato Predominante del Examen
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

            {preguntas.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-[0_4px_12px_rgba(0,0,0,0.01)] space-y-4"
              >
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 -mx-6 -mt-6 p-4 rounded-t-2xl">
                  <input
                    type="text"
                    value={p.tituloReferencia}
                    onChange={(e) =>
                      handleModificarEjeConceptual(p.id, e.target.value)
                    }
                    className="bg-transparent font-bold text-sm text-slate-800 border-none focus:outline-none focus:ring-1 focus:ring-indigo-200 px-2 py-0.5 rounded w-2/3"
                    required
                  />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-1 rounded">
                    Pregunta {p.id}
                  </span>
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
                        <select
                          value={variante.tipo}
                          onChange={(e) =>
                            handleModificarTipo(
                              p.id,
                              variante.id,
                              e.target.value,
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
                        className="block w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all resize-none"
                        required
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
                              <input
                                type="text"
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
                                className="block w-full px-3 py-1.5 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-200 text-slate-700 font-medium"
                                required
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
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

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5 mb-4">
              🛡️ Protocolo Antifraude
            </h3>
            <div className="space-y-4">
              {securityMeasures.map((measure) => {
                const isActive = !!securityConfig[measure.id];
                return (
                  <div
                    key={measure.id}
                    className="flex items-start justify-between gap-4 p-1"
                  >
                    <div className="space-y-0.5">
                      <label
                        className="text-xs font-bold text-slate-700 block cursor-pointer"
                        onClick={() => handleToggleSecurity(measure.id)}
                      >
                        {measure.label}
                      </label>
                      <p className="text-[11px] text-slate-400 leading-normal font-medium">
                        {measure.desc}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleSecurity(measure.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${isActive ? "bg-indigo-600" : "bg-slate-200"}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? "translate-x-4" : "translate-x-0"}`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5">
              ⏳ Parámetros de Tiempo
            </h3>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Límite por Intento
              </label>
              <div className="relative rounded-xl shadow-sm">
                  <input
                    type="number"
                    min="1"
                    placeholder="Ej: 90"
                    value={duracionMinutos}
                    onChange={(e) => setDuracionMinutos(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    className="block w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all"
                  />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4">
                  <span className="text-xs font-bold text-slate-400">min</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5">
              🔄 Regulación de Intentos
            </h3>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Cantidad Máxima Permitida
              </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={cantidadIntentos}
                  onChange={(e) => setCantidadIntentos(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="block w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all text-slate-800 font-medium"
                  required
                />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5">
              📅 Calendario de Disponibilidad
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Fecha de Apertura
                </label>
                <input
                  type="datetime-local"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="block w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-medium focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Fecha de Cierre
                </label>
                <input
                  type="datetime-local"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="block w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-600 font-medium focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2.5">
              🏫 Comisión de Destino
            </h3>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Publicar en Cátedra
              </label>
              <select
                value={idMateriaDivision}
                onChange={(e) => {
                  console.log("🔍 select onChange:", { value: e.target.value, type: typeof e.target.value });
                  setIdMateriaDivision(e.target.value);
                }}
                disabled={cargandoComisiones || !comisiones || comisiones.length === 0}
                className="block w-full px-4 py-2.5 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all text-slate-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                required
              >
                <option value="" disabled key="default">
                  {cargandoComisiones
                    ? "Cargando tus comisiones..."
                    : !comisiones || comisiones.length === 0
                      ? "No tienes comisiones asignadas"
                      : "Seleccioná una comisión..."}
                </option>
                {comisiones?.map((com: any, idx: number) => (
                  <option key={com.idComision ?? `fallback-${idx}`} value={com.idComision}>
                    {com.nombreMateria} — {com.division}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
