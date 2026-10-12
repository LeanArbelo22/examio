import { describe, expect, it } from "vitest";
import {
  fromEvaluacionDetalle,
  toGuardarEvaluacionPayload,
  toModificarBorradorPayload,
  toPublicarEvaluacionPayload,
} from "./exam-form";
import type { ExamFormValues } from "./schemas/examSchema";

describe("toGuardarEvaluacionPayload", () => {
  it("convierte el formulario al casing y tipos esperados por la API", () => {
    const form: ExamFormValues = {
      titulo: "Parcial SQL",
      descripcion: "Consultas y normalización",
      idMateriaDivision: "12",
      duracionMinutos: "90",
      cantidadIntentos: "2",
      escalaCalificacion: 100,
      notaAprobacion: "40",
      modoPuntaje: "personalizados",
      mostrarPuntajePorPregunta: true,
      correccionAutomaticaCerradas: false,
      fechaInicio: "2026-08-07T10:00",
      fechaFin: "2026-08-07T12:00",
      preguntas: [
        {
          id: 1,
          tituloReferencia: "Consultas",
          puntajeMaximo: "100",
          variantes: [
            {
              id: "v1",
              enunciado: "Elegí consultas válidas",
              tipo: "multiple",
              modoJustificacion: "opcional",
              estrategiaCorreccion: "parcial_sin_penalizacion",
              tratamientoJustificacion: "revision_manual",
              opciones: [
                { texto: "SELECT 1", esCorrecta: true },
                { texto: "SELECT 2", esCorrecta: true },
              ],
            },
          ],
        },
      ],
    };

    const payload = toGuardarEvaluacionPayload(form, "Pantalla completa");
    expect(payload).toMatchObject({
      Titulo: "Parcial SQL",
      IdMateriaDivision: 12,
      DuracionMinutos: 90,
      CantidadIntentosMaximos: 2,
      RecursosPermitidos: "Pantalla completa",
      EscalaCalificacion: 100,
      NotaAprobacion: 40,
      ModoPuntaje: "personalizados",
      MostrarPuntajePorPregunta: true,
      CorreccionAutomaticaCerradas: false,
      GruposPreguntas: [
        {
          TituloReferencia: "Consultas",
          PuntajeMaximo: 100,
          Variantes: [
            {
              Enunciado: "Elegí consultas válidas",
              Tipo: "multiple",
              ModoJustificacion: "opcional",
              EstrategiaCorreccion: "parcial_sin_penalizacion",
              TratamientoJustificacion: "revision_manual",
            },
          ],
        },
      ],
    });
    expect(payload.FechaInicio).toBe(new Date(form.fechaInicio).toISOString());
  });

  it("convierte duración y descripción vacías a valores opcionales", () => {
    const form = {
      titulo: "Parcial",
      descripcion: "",
      idMateriaDivision: "1",
      duracionMinutos: "",
      cantidadIntentos: "1",
      fechaInicio: "2026-08-07T10:00",
      fechaFin: "2026-08-07T12:00",
      preguntas: [],
    } satisfies ExamFormValues;
    const payload = toGuardarEvaluacionPayload(form, "");
    expect(payload.DuracionMinutos).toBeNull();
    expect(payload.Descripcion).toBeUndefined();
    expect(payload.RecursosPermitidos).toBeUndefined();
  });

  it("conserva IDs persistidos y la revisión al modificar un borrador", () => {
    const form = {
      titulo: "Borrador",
      descripcion: "",
      idMateriaDivision: "9",
      duracionMinutos: "90",
      cantidadIntentos: "1",
      fechaInicio: "2026-08-07T10:00",
      fechaFin: "2026-08-07T12:00",
      preguntas: [
        {
          id: 1,
          persistedId: 20,
          bankReference: { id: 120, revision: 4 },
          tituloReferencia: "SQL",
          variantes: [
            {
              id: "question-30",
              persistedId: 30,
              bankReference: { id: 130, revision: 5 },
              enunciado: "Consulta",
              tipo: "mc" as const,
              opciones: [
                { persistedId: 40, texto: "SELECT", esCorrecta: true },
                { persistedId: 41, texto: "DROP", esCorrecta: false },
              ],
            },
          ],
        },
      ],
    };

    const payload = toModificarBorradorPayload(form, "", 7, 3);
    expect(payload).toMatchObject({
      IdPublicacion: 7,
      RevisionEsperada: 3,
      GruposPreguntas: [
        {
          Id: 20,
          ReferenciaBanco: { IdGrupo: 120, RevisionEsperada: 4 },
          Variantes: [
            {
              Id: 30,
              ReferenciaBanco: { IdPregunta: 130, RevisionEsperada: 5 },
              Opciones: [{ Id: 40 }, { Id: 41 }],
            },
          ],
        },
      ],
    });
    expect(payload).not.toHaveProperty("Estado");
  });

  it("incluye importaciones y la intención explícita al publicar", () => {
    const form = {
      titulo: "Parcial",
      descripcion: "",
      idMateriaDivision: "9",
      duracionMinutos: "90",
      cantidadIntentos: "1",
      fechaInicio: "2026-10-07T10:00",
      fechaFin: "2026-10-07T12:00",
      preguntas: [],
    } satisfies ExamFormValues;
    const imports = [
      {
        Tipo: "pregunta" as const,
        IdPregunta: 10,
        RevisionEsperada: 2,
        TituloReferencia: "Redes",
      },
    ];

    const payload = toPublicarEvaluacionPayload(
      form,
      "",
      7,
      3,
      false,
      imports,
    );

    expect(payload.GuardarTodoEnBanco).toBe(false);
    expect(payload.ImportacionesBanco).toEqual(imports);
    expect(payload.RevisionEsperada).toBe(3);
  });

  it("adapta el detalle del backend al formulario editable", () => {
    const form = fromEvaluacionDetalle(
      {
        idActividad: 5,
        idPublicacion: 7,
        titulo: "Borrador",
        tipo: "evaluacion",
        duracionMinutos: 90,
        cantidadIntentosMaximos: 1,
        estado: "borrador",
        revision: 2,
        escalaCalificacion: 10,
        notaAprobacion: 4,
        modoPuntaje: "iguales",
        mostrarPuntajePorPregunta: false,
        correccionAutomaticaCerradas: true,
        recursosPermitidos: null,
        fechaInicio: "2026-08-07T13:00:00.000Z",
        fechaFin: "2026-08-07T15:00:00.000Z",
        materia: "Bases de Datos",
        division: "1A",
        grupos: [],
      },
      12,
    );

    expect(form.idMateriaDivision).toBe("12");
    expect(form.preguntas).toEqual([]);
    expect(form).toMatchObject({
      escalaCalificacion: 10,
      notaAprobacion: "4",
      modoPuntaje: "iguales",
      mostrarPuntajePorPregunta: false,
      correccionAutomaticaCerradas: true,
    });
  });

  it("recupera las referencias de procedencia del detalle", () => {
    const form = fromEvaluacionDetalle(
      {
        idActividad: 5,
        idPublicacion: 7,
        titulo: "Borrador",
        tipo: "evaluacion",
        duracionMinutos: 90,
        cantidadIntentosMaximos: 1,
        estado: "borrador",
        revision: 2,
        escalaCalificacion: 100,
        notaAprobacion: 40,
        modoPuntaje: "personalizados",
        mostrarPuntajePorPregunta: true,
        correccionAutomaticaCerradas: false,
        recursosPermitidos: null,
        fechaInicio: "2026-10-07T13:00:00.000Z",
        fechaFin: "2026-10-07T15:00:00.000Z",
        materia: "Bases",
        division: "1A",
        grupos: [
          {
            idGrupo: 20,
            tituloReferencia: "SQL",
            puntajeMaximo: 100,
            idBancoGrupoOrigen: 120,
            revisionBancoOrigen: 4,
            preguntas: [
              {
                idPregunta: 30,
                enunciado: "Elegí consultas válidas",
                tipo: "multiple",
                modoJustificacion: "opcional",
                estrategiaCorreccion: "parcial_sin_penalizacion",
                tratamientoJustificacion: "revision_manual",
                contenidoHash: "a".repeat(64),
                idBancoPreguntaOrigen: 130,
                revisionBancoOrigen: 5,
                opciones: [],
              },
            ],
          },
        ],
      },
      12,
    );

    expect(form.preguntas[0].bankReference).toEqual({ id: 120, revision: 4 });
    expect(form.preguntas[0].puntajeMaximo).toBe("100");
    expect(form.preguntas[0].variantes[0].bankReference).toEqual({
      id: 130,
      revision: 5,
    });
    expect(form.preguntas[0].variantes[0]).toMatchObject({
      modoJustificacion: "opcional",
      estrategiaCorreccion: "parcial_sin_penalizacion",
      tratamientoJustificacion: "revision_manual",
    });
  });
});
