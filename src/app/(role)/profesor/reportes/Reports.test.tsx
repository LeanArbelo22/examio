import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  ReporteEvaluacionesListado,
  ReporteGruposListado,
  ReporteOpcionesListado,
  ReportePreguntasListado,
  ReporteRendimientoListado,
} from "@/types";
import { ContentPerformanceReport } from "./ContentPerformanceReport";
import { EvaluacionesReport } from "./EvaluacionesReport";
import { RendimientoReport } from "./RendimientoReport";
import { TeacherPublicationAnalysis } from "./TeacherPublicationAnalysis";
import { ApiError } from "@/lib/api";

const reportMocks = vi.hoisted(() => ({
  pathname: "/profesor/reportes",
  search: "",
  replace: vi.fn(),
  push: vi.fn(),
  evaluacionesHook: vi.fn(),
  rendimientoHook: vi.fn(),
  preguntasHook: vi.fn(),
  gruposHook: vi.fn(),
  opcionesHook: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => reportMocks.pathname,
  useRouter: () => ({ replace: reportMocks.replace, push: reportMocks.push }),
  useSearchParams: () => new URLSearchParams(reportMocks.search),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { identificadorInstitucional: 9001 } },
  }),
}));

vi.mock("@/hooks/useMaterias", () => ({
  useGetMaterias: () => ({ materias: [{ id: 3, nombre: "Programación" }] }),
}));

vi.mock("@/hooks/useComisiones", () => ({
  useGetComisiones: () => ({
    comisiones: [
      { idMateriaDivision: 44, materia: "Programación", division: "1A" },
    ],
  }),
}));

vi.mock("@/hooks/useEvaluaciones", () => ({
  useGetEvaluacionesDocente: () => ({
    data: [
      {
        idActividad: 10,
        idPublicacion: 47,
        idMateria: 3,
        idMateriaDivision: 44,
        titulo: "Primer parcial",
        tipo: "evaluacion",
        materia: "Programación",
        carrera: "Tecnicatura",
        division: "1A",
        fechaInicio: "2026-08-01T12:00:00.000Z",
        fechaFin: "2026-08-01T14:00:00.000Z",
        duracionMinutos: 120,
        cantidadIntentosMaximos: 2,
        recursosPermitidos: null,
        estado: "publicada",
        alumnosInscriptos: 20,
        totalIntentos: 18,
      },
    ],
  }),
}));

const resultadosOficiales = {
  intentosValidosEntregados: 16,
  resultadosConsiderados: 14,
  resultadosPendientes: 2,
  intentosPendientesConfirmacion: 2,
  intentosConfirmadosSinNota: 0,
  intentosConPreguntasSinPuntaje: 2,
  preguntasSinPuntaje: 3,
  aprobados: 11,
  desaprobados: 3,
  porcentajeAprobacion: 78.57,
  porcentajeCoberturaConfirmada: 87.5,
  promedioNotaBase10: 7.25,
};

const pendientesOperativos = {
  intentosEntregadosPendientes: 3,
  intentosPendientesConfirmacion: 2,
  intentosSinNotaFinal: 2,
  intentosConPreguntasSinPuntaje: 2,
  preguntasSinPuntaje: 4,
};

vi.mock("@/hooks/useReportes", () => ({
  useReporteRendimientoEvaluaciones: (...args: unknown[]) =>
    reportMocks.evaluacionesHook(...args),
  useReporteRendimiento: (...args: unknown[]) =>
    reportMocks.rendimientoHook(...args),
  useReporteRendimientoPreguntas: (...args: unknown[]) =>
    reportMocks.preguntasHook(...args),
  useReporteRendimientoGrupos: (...args: unknown[]) =>
    reportMocks.gruposHook(...args),
  useReporteOpcionesPregunta: (...args: unknown[]) =>
    reportMocks.opcionesHook(...args),
}));

vi.mock("@/components/reports/EvaluationReportCharts", () => ({
  EvaluationReportCharts: ({ distribution }: { distribution: unknown[] }) => (
    <div>Distribución global: {distribution.length}</div>
  ),
}));

vi.mock("@/components/reports/ReportCharts", () => ({
  ReportCharts: ({ alumnos }: { alumnos: unknown[] }) => (
    <div>Gráficos de página: {alumnos.length}</div>
  ),
}));

vi.mock("@/components/reports/StudentReportDetail", () => ({
  StudentReportDetail: ({ matricula }: { matricula: number | null }) =>
    matricula ? <div>Detalle del alumno {matricula}</div> : null,
}));

vi.mock("@/components/reports/ContentPerformanceCharts", () => ({
  ContentPerformanceCharts: ({ kind }: { kind: string }) => (
    <div>Gráficos de {kind}</div>
  ),
}));

const evaluationReport: ReporteEvaluacionesListado = {
  criterios: {
    alcanceIntentos: "todos",
    escalaPromedio: 10,
    conPendientesCorreccion: null,
    conIncidentes: null,
    tipoIncidente: null,
    severidad: null,
    soloIncidentesSinRevisar: null,
  },
  kpis: {
    totalEvaluaciones: 2,
    totalAlumnosAlcanzados: 35,
    totalAlumnosUnicos: 30,
    totalIntentos: 28,
    totalEntregados: 24,
    totalEnProgreso: 2,
    totalVencidos: 1,
    totalAnulados: 1,
    totalIntentosAlcanceAcademico: 24,
    totalIntentosCalificados: 20,
    intentosPendientesCorreccion: 4,
    promedioIntentosCalificados: 7.25,
    promedioIntentosCalificadosBase10: 7.25,
    tasaAprobacionIntentos: 75,
    intentosAnulados: 1,
    alumnosConIncidentes: 4,
    totalIncidentes: 7,
    incidentesSinRevisar: 2,
    resultadosOficiales,
    pendientesOperativos,
  },
  graficos: {
    distribucionResultados: [
      { categoria: "Aprobados", cantidad: 15 },
      { categoria: "Desaprobados", cantidad: 5 },
    ],
  },
  evaluaciones: [
    {
      idPublicacion: 47,
      idActividad: 10,
      idCarrera: 1,
      carrera: "Desarrollo de Software",
      titulo: "Primer parcial",
      idMateria: 3,
      materia: "Programación",
      idMateriaDivision: 44,
      division: "1A",
      fechaInicio: "2026-08-01T12:00:00.000Z",
      fechaFin: "2026-08-01T14:00:00.000Z",
      estado: "publicada",
      escalaCalificacion: 10,
      notaAprobacion: 6,
      alumnosAlcanzados: 20,
      alumnosQueIniciaron: 18,
      sinIniciar: 2,
      intentosTotales: 18,
      entregados: 16,
      enProgreso: 1,
      vencidos: 1,
      anulados: 0,
      intentosAlcanceAcademico: 14,
      intentosCalificados: 14,
      intentosPendientesCorreccion: 2,
      promedioIntentosCalificados: 7.5,
      promedioIntentosCalificadosBase10: 7.5,
      intentosAprobados: 11,
      intentosDesaprobados: 3,
      porcentajeAprobacionIntentos: 78.57,
      intentosAnulados: 1,
      alumnosConIncidentes: 3,
      totalIncidentes: 5,
      incidentesSinRevisar: 2,
      resultadosOficiales,
      pendientesOperativos,
    },
  ],
  paginacion: { pagina: 2, limite: 20, total: 2, totalPaginas: 2 },
};

const studentReport: ReporteRendimientoListado = {
  kpis: {
    totalAlumnos: 30,
    conIntentos: 25,
    totalIntentos: 40,
    intentosAlcanceAcademico: 32,
    promedioGeneral: 7.4,
    escalaPromedio: 10,
    alcanceIntentos: "todos",
    tasaAprobacion: 72.5,
  },
  alumnos: [
    {
      matricula: 30123,
      nombre: "Ada",
      apellido: "Lovelace",
      totalIntentos: 2,
      intentosAlcanceAcademico: 2,
      totalCorregidos: 2,
      promedio: 9,
      escalaPromedio: 10,
      alcanceIntentos: "todos",
      aprobados: 2,
      desaprobados: 0,
      porcentajeAprobacion: 100,
    },
  ],
  paginacion: { pagina: 1, limite: 20, total: 30, totalPaginas: 2 },
};

const contentKpis = {
  presentadas: 40,
  respondidas: 35,
  omitidas: 5,
  pendientesCorreccion: 2,
  correctas: 20,
  parciales: 8,
  incorrectas: 5,
  justificacionesEntregadas: 10,
  porcentajePuntajePromedio: 74.5,
  tasaAcierto: 60.6,
  muestrasTiempo: 30,
  muestrasTiempoNuevas: 28,
  muestrasTiempoLegacy: 2,
  coberturaTemporal: 0.75,
  tiempoPromedioMilisegundos: 32500,
  tiempoMaximoMilisegundos: 90000,
  presentacionesOficiales: 42,
  muestrasConfirmadas: 40,
  presentacionesExcluidasSinPuntaje: 1,
  presentacionesExcluidasSinMaximoPositivo: 1,
};

const contentCriteria = {
  alcanceIntentos: "todos" as const,
  estadoCorreccion: "todas" as const,
  normalizacionPuntaje: "porcentaje_puntaje_maximo" as const,
  identidadContenido: "contenidoHashSnapshot" as const,
};

const questionsReport: ReportePreguntasListado = {
  criterios: contentCriteria,
  kpis: contentKpis,
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  items: [{
    claveContenido: "hash-tcp",
    contenidoHashSnapshot: "a".repeat(64),
    idPregunta: 10,
    idGrupoPregunta: 3,
    cantidadPreguntasOrigen: 1,
    cantidadGrupos: 1,
    enunciado: "¿Qué protocolo garantiza la entrega?",
    tipo: "mc",
    grupo: "Protocolos",
    tieneProcedenciaBanco: true,
    cantidadOrigenesBanco: 1,
    incluyeSnapshotReconstruido: false,
    justificacionesEntregadas: 10,
    puntajePromedioObtenido: 0.75,
    presentadas: 40,
    respondidas: 35,
    omitidas: 5,
    pendientesCorreccion: 2,
    correctas: 20,
    parciales: 8,
    incorrectas: 5,
    porcentajePuntajePromedio: 74.5,
    tasaAcierto: 60.6,
    muestrasTiempo: 30,
    muestrasTiempoNuevas: 28,
    muestrasTiempoLegacy: 2,
    coberturaTemporal: 0.75,
    tiempoPromedioMilisegundos: 32500,
    tiempoMedianaMilisegundos: 30000,
    tiempoMaximoMilisegundos: 90000,
    presentacionesOficiales: 42,
    muestrasConfirmadas: 40,
    presentacionesExcluidasSinPuntaje: 1,
    presentacionesExcluidasSinMaximoPositivo: 1,
    hallazgoBajoRendimiento: {
      detectado: false,
      codigo: "pregunta_bajo_rendimiento",
      version: 1,
    },
  }],
};

const findingsReport: ReportePreguntasListado = {
  ...questionsReport,
  criterios: {
    ...contentCriteria,
    alcanceIntentos: "validos",
    estadoCorreccion: "confirmada",
    soloHallazgosBajoRendimiento: true,
    alcanceIntentosAplicadoPorHallazgo: true,
    estadoCorreccionAplicadoPorHallazgo: true,
  },
  reglaHallazgo: {
    codigo: "pregunta_bajo_rendimiento",
    version: 1,
    porcentajePuntajeMaximoExclusivo: 30,
    muestrasConfirmadasMinimas: 10,
  },
  resumenFiltro: {
    preguntasEnCoberturaGeneral: 3,
    preguntasConMuestraSuficiente: 2,
    preguntasConMuestraInsuficiente: 1,
    preguntasCoincidentes: 1,
    presentacionesCoincidentes: 18,
    muestrasConfirmadasCoincidentes: 17,
  },
  items: [
    {
      ...questionsReport.items[0],
      porcentajePuntajePromedio: 30,
      muestrasConfirmadas: 17,
      hallazgoBajoRendimiento: {
        detectado: true,
        codigo: "pregunta_bajo_rendimiento",
        version: 1,
      },
    },
  ],
};

const groupsReport: ReporteGruposListado = {
  criterios: contentCriteria,
  kpis: contentKpis,
  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  items: [{
    idGrupoPregunta: 3,
    idActividad: 10,
    grupo: "Protocolos",
    cantidadVariantes: 2,
    tieneProcedenciaBanco: true,
    justificacionesEntregadas: 10,
    diferenciaVariantesPuntosPorcentuales: 12.5,
    variantes: [],
    presentadas: 40,
    respondidas: 35,
    omitidas: 5,
    pendientesCorreccion: 2,
    correctas: 20,
    parciales: 8,
    incorrectas: 5,
    porcentajePuntajePromedio: 74.5,
    tasaAcierto: 60.6,
    muestrasTiempo: 30,
    muestrasTiempoNuevas: 28,
    muestrasTiempoLegacy: 2,
    coberturaTemporal: 0.75,
    tiempoPromedioMilisegundos: 32500,
    tiempoMedianaMilisegundos: 30000,
    tiempoMaximoMilisegundos: 90000,
    presentacionesOficiales: 42,
    muestrasConfirmadas: 40,
    presentacionesExcluidasSinPuntaje: 1,
    presentacionesExcluidasSinMaximoPositivo: 1,
  }],
};

const optionsReport: ReporteOpcionesListado = {
  criterios: { ...contentCriteria, idPregunta: 10 },
  kpis: {
    presentadas: 40,
    respondidas: 35,
    omitidas: 5,
    justificacionesEntregadas: 10,
    totalSelecciones: 35,
    seleccionesDistractores: 8,
  },
  pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
  items: [{
    claveContenido: "hash-tcp",
    contenidoHashSnapshot: "a".repeat(64),
    posicion: 1,
    texto: "TCP",
    esCorrecta: true,
    esDistractor: false,
    presentaciones: 40,
    selecciones: 27,
    porcentajeSeleccion: 77.14,
  }],
};

function successfulQuery(data: unknown) {
  return {
    data,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  };
}

function failedQuery(error: Error) {
  return {
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: true,
    error,
    refetch: vi.fn(),
  };
}

describe("reportes docentes", () => {
  beforeEach(() => {
    reportMocks.search = "";
    reportMocks.replace.mockReset();
    reportMocks.push.mockReset();
    reportMocks.evaluacionesHook.mockReset();
    reportMocks.rendimientoHook.mockReset();
    reportMocks.preguntasHook.mockReset();
    reportMocks.gruposHook.mockReset();
    reportMocks.opcionesHook.mockReset();
    reportMocks.evaluacionesHook.mockReturnValue(successfulQuery(evaluationReport));
    reportMocks.rendimientoHook.mockReturnValue(successfulQuery(studentReport));
    reportMocks.preguntasHook.mockReturnValue(successfulQuery(questionsReport));
    reportMocks.gruposHook.mockReturnValue(successfulQuery(groupsReport));
    reportMocks.opcionesHook.mockReturnValue(successfulQuery(optionsReport));
  });

  it("usa KPIs y distribución global del backend en el reporte por evaluación", async () => {
    const user = userEvent.setup();
    reportMocks.search = "reporte=evaluaciones&pagina=2";
    render(<EvaluacionesReport />);

    expect(screen.getByText("30 alumnos únicos")).toBeVisible();
    expect(screen.getByText("Distribución global: 2")).toBeVisible();
    expect(screen.getAllByText("Primer parcial")).toHaveLength(2);
    expect(reportMocks.evaluacionesHook).toHaveBeenCalledWith(
      expect.objectContaining({ pagina: 2, limite: 20 }),
    );

    await user.click(
      screen.getByRole("button", { name: "Ordenar por Promedio por intento" }),
    );
    expect(reportMocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("ordenarPor=promedio"),
      { scroll: false },
    );
  });

  it("valida el rango temporal antes de consultar otra página", async () => {
    const user = userEvent.setup();
    render(<EvaluacionesReport />);

    await user.type(screen.getByLabelText("Fecha desde"), "2026-08-20");
    await user.type(screen.getByLabelText("Fecha hasta"), "2026-08-10");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(
      screen.getByText("La fecha desde no puede ser posterior a la fecha hasta."),
    ).toBeVisible();
    expect(reportMocks.replace).not.toHaveBeenCalled();
  });

  it("sincroniza alcance académico y pendientes con la URL", async () => {
    const user = userEvent.setup();
    render(<EvaluacionesReport />);

    await user.selectOptions(screen.getByLabelText("Resultados académicos"), "validos");
    await user.selectOptions(screen.getByLabelText("Correcciones pendientes"), "true");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(reportMocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("alcanceIntentos=validos"),
      { scroll: false },
    );
    expect(reportMocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("conPendientesCorreccion=true"),
      { scroll: false },
    );
  });

  it("presenta y filtra los indicadores operativos de incidentes", async () => {
    const user = userEvent.setup();
    render(<EvaluacionesReport />);

    expect(screen.getByText("7")).toBeVisible();
    expect(screen.getByText("4")).toBeVisible();
    expect(screen.getAllByText("2")).not.toHaveLength(0);
    expect(screen.getByText("5")).toBeVisible();
    expect(screen.getByText("2 pendientes")).toBeVisible();

    await user.selectOptions(screen.getByLabelText("Incidentes"), "true");
    await user.selectOptions(
      screen.getByLabelText("Tipo de incidente"),
      "focus_lost",
    );
    await user.selectOptions(
      screen.getByLabelText("Consecuencia"),
      "anular_intento",
    );
    await user.selectOptions(
      screen.getByLabelText("Revisión de incidentes"),
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(reportMocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("conIncidentes=true"),
      { scroll: false },
    );
    expect(reportMocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("tipoIncidente=focus_lost"),
      { scroll: false },
    );
    expect(reportMocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("severidad=anular_intento"),
      { scroll: false },
    );
    expect(reportMocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("soloIncidentesSinRevisar=true"),
      { scroll: false },
    );
  });

  it("presenta KPIs globales y evita gráficos construidos desde la página del reporte por alumno", async () => {
    const user = userEvent.setup();
    render(<RendimientoReport />);

    expect(screen.getByText("30")).toBeVisible();
    expect(screen.queryByText("Gráficos de página: 1")).not.toBeInTheDocument();
    expect(screen.getByText("Lovelace, Ada")).toBeVisible();

    await user.click(screen.getByText("Lovelace, Ada"));
    expect(screen.getByText("Detalle del alumno 30123")).toBeVisible();
  });

  it("impide filtrar por actividad sin matrícula en el reporte por alumno", async () => {
    const user = userEvent.setup();
    render(<RendimientoReport />);

    await user.selectOptions(screen.getByLabelText("Actividad"), "10");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(
      screen.getByText(/El filtro Actividad requiere una matrícula/),
    ).toBeVisible();
    expect(reportMocks.replace).not.toHaveBeenCalled();
  });

  it("presenta métricas por pregunta y abre el detalle de opciones", async () => {
    const user = userEvent.setup();
    reportMocks.search = "reporte=preguntas";
    render(<ContentPerformanceReport kind="preguntas" />);

    expect(screen.getAllByText("¿Qué protocolo garantiza la entrega?")[0]).toBeVisible();
    expect(screen.getAllByText("75.0%")[0]).toBeVisible();
    expect(screen.getByText("Gráficos de preguntas")).toBeVisible();
    expect(screen.getByText("Rankings de preguntas")).toBeVisible();
    expect(screen.getByText("Menor puntaje promedio")).toBeVisible();
    expect(screen.getByText("Mayor tiempo promedio")).toBeVisible();
    expect(reportMocks.preguntasHook).toHaveBeenCalledWith(
      expect.objectContaining({
        pagina: 1,
        limite: 5,
        ordenarPor: "porcentajePuntaje",
        ordenDireccion: "asc",
      }),
      true,
    );
    expect(reportMocks.preguntasHook).toHaveBeenCalledWith(
      expect.objectContaining({
        pagina: 1,
        limite: 5,
        ordenarPor: "tiempoPromedio",
        ordenDireccion: "desc",
      }),
      true,
    );

    await user.click(screen.getByRole("button", { name: "Ver opciones" }));
    expect(screen.getByRole("dialog", { name: "Detalle de la pregunta" })).toBeVisible();
    expect(screen.getByText("TCP")).toBeVisible();
    expect(reportMocks.opcionesHook).toHaveBeenCalledWith(
      10,
      expect.objectContaining({
        claveContenido: "hash-tcp",
        limite: 100,
        ordenarPor: "posicion",
      }),
    );
  });

  it.each([
    {
      code: "QUESTION_CONTENT_NOT_FOUND",
      status: 404,
      message: /No se encontró evidencia histórica para este contenido/,
    },
    {
      code: "QUESTION_OPTION_EVIDENCE_INCONSISTENT",
      status: 409,
      message: /Las versiones históricas de las opciones no pueden compararse/,
    },
  ])(
    "mantiene $code dentro del panel de opciones",
    async ({ code, status, message }) => {
      const user = userEvent.setup();
      reportMocks.search = "reporte=preguntas";
      reportMocks.opcionesHook.mockReturnValue(
        failedQuery(new ApiError("Evidencia no disponible", status, code)),
      );

      render(<ContentPerformanceReport kind="preguntas" />);
      await user.click(screen.getByRole("button", { name: "Ver opciones" }));

      expect(screen.getByText(message)).toBeVisible();
      expect(
        screen.getAllByText("¿Qué protocolo garantiza la entrega?").length,
      ).toBeGreaterThanOrEqual(2);
    },
  );

  it("selecciona una publicación desde catálogos autorizados y conserva el retorno", async () => {
    const user = userEvent.setup();
    reportMocks.search = "reporte=analisis";
    render(<TeacherPublicationAnalysis />);

    expect(screen.getAllByText("Programación · 1A")).not.toHaveLength(0);
    expect(screen.getAllByText("Primer parcial")).not.toHaveLength(0);
    expect(screen.getByText("1 resultado")).toBeVisible();
    expect(screen.getByText("120 min")).toBeVisible();
    expect(screen.getByText("20 estudiantes")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Ver análisis" }));

    const target = reportMocks.replace.mock.calls[0]?.[0] as string;
    expect(target).toContain("reporte=analisis");
    expect(target).toContain("analisisMateria=3");
    expect(target).toContain("analisisComision=44");
    expect(target).toContain("analisisActividad=10");
    expect(target).toContain("idPublicacion=47");
  });

  it("separa resultados oficiales de pendientes operativos", () => {
    reportMocks.search = "reporte=analisis&idPublicacion=47";
    render(<TeacherPublicationAnalysis />);

    expect(screen.getByRole("heading", { name: "Resultados oficiales" })).toBeVisible();
    expect(screen.getByText("Resultados considerados")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Pendientes operativos" })).toBeVisible();
    expect(screen.getByText(/Las subcategorías se superponen y no deben sumarse/)).toBeVisible();
    expect(screen.getByText(/puede diferir de los resultados oficiales/)).toBeInTheDocument();
  });

  it("presenta hallazgos e insuficiencia con lenguaje orientado al docente", () => {
    reportMocks.search =
      "reporte=analisis&idPublicacion=47&analisisPaso=preguntas&fechaDesde=2026-01-01&fechaHasta=2026-12-31";
    reportMocks.preguntasHook.mockImplementation((filters) =>
      successfulQuery(
        (filters as { soloHallazgosBajoRendimiento?: boolean })
          .soloHallazgosBajoRendimiento
          ? findingsReport
          : questionsReport,
      ),
    );

    render(<TeacherPublicationAnalysis />);

    expect(screen.getByText(/1 pregunta\(s\) tienen evidencia insuficiente/)).toBeVisible();
    expect(screen.getByText(/Se detectaron 1 pregunta\(s\)/)).toBeVisible();
    expect(screen.getByText(/un 30,00% visible puede estar apenas por debajo del límite/)).toBeVisible();
    expect(screen.getByText("Preguntas prioritarias para revisar")).toBeVisible();
    expect(screen.getByText("Todas las preguntas con evidencia oficial")).toBeVisible();

    expect(reportMocks.preguntasHook).toHaveBeenCalledWith(
      expect.objectContaining({
        idPublicacion: "47",
        alcanceIntentos: "validos",
        estadoCorreccion: "confirmada",
        soloHallazgosBajoRendimiento: true,
        pagina: 1,
        limite: 10,
      }),
      true,
    );
    expect(reportMocks.preguntasHook).not.toHaveBeenCalledWith(
      expect.objectContaining({ fechaDesde: expect.anything() }),
      expect.anything(),
    );
  });

  it("distingue ausencia de datos de ausencia de hallazgos evaluables", () => {
    reportMocks.search =
      "reporte=analisis&idPublicacion=47&analisisPaso=preguntas";
    reportMocks.preguntasHook.mockImplementation((filters) => {
      const isRanking = (filters as { soloHallazgosBajoRendimiento?: boolean })
        .soloHallazgosBajoRendimiento;
      return successfulQuery(
        isRanking
          ? {
              ...findingsReport,
              resumenFiltro: {
                ...findingsReport.resumenFiltro!,
                preguntasEnCoberturaGeneral: 0,
                preguntasConMuestraSuficiente: 0,
                preguntasConMuestraInsuficiente: 0,
                preguntasCoincidentes: 0,
              },
              items: [],
            }
          : { ...questionsReport, items: [], pagination: { ...questionsReport.pagination, total: 0 } },
      );
    });

    render(<TeacherPublicationAnalysis />);

    expect(
      screen.getByText("No hay presentaciones oficiales para analizar en esta publicación."),
    ).toBeVisible();
    expect(
      screen.queryByText(/No se detectaron hallazgos entre las preguntas/),
    ).not.toBeInTheDocument();
  });

  it("comunica ausencia de hallazgos sin ocultar preguntas con muestra insuficiente", () => {
    reportMocks.search =
      "reporte=analisis&idPublicacion=47&analisisPaso=preguntas";
    reportMocks.preguntasHook.mockImplementation((filters) => {
      const isRanking = (filters as { soloHallazgosBajoRendimiento?: boolean })
        .soloHallazgosBajoRendimiento;
      return successfulQuery(
        isRanking
          ? {
              ...findingsReport,
              resumenFiltro: {
                ...findingsReport.resumenFiltro!,
                preguntasCoincidentes: 0,
                presentacionesCoincidentes: 0,
                muestrasConfirmadasCoincidentes: 0,
              },
              items: [],
            }
          : questionsReport,
      );
    });

    render(<TeacherPublicationAnalysis />);

    expect(screen.getByText(/1 pregunta\(s\) tienen evidencia insuficiente/)).toBeVisible();
    expect(
      screen.getByText(
        "No se detectaron hallazgos entre las preguntas con evidencia suficiente.",
      ),
    ).toBeVisible();
  });

  it("muestra variantes y sincroniza filtros del reporte por grupo", async () => {
    const user = userEvent.setup();
    reportMocks.search = "reporte=grupos";
    render(<ContentPerformanceReport kind="grupos" />);

    expect(screen.getAllByText("Protocolos")[0]).toBeVisible();
    expect(screen.getByText("2 variantes")).toBeVisible();
    expect(screen.getByText("Rankings de grupos")).toBeVisible();
    expect(reportMocks.gruposHook).toHaveBeenCalledWith(
      expect.objectContaining({
        pagina: 1,
        limite: 5,
        ordenarPor: "porcentajePuntaje",
        ordenDireccion: "asc",
      }),
      true,
    );
    await user.selectOptions(screen.getByLabelText("Intentos académicos"), "validos");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(reportMocks.replace).toHaveBeenCalledWith(
      expect.stringContaining("alcanceIntentos=validos"),
      { scroll: false },
    );
  });
});
