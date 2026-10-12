import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 55813);
let evaluationState = "borrador";
let lastDraftRequest = null;
let selectedValidAttempt = null;
const focusIncidents = new Map();

const users = {
  "admin@cervantes.edu.ar": { id: 1, name: "Admin E2E", role: "admin" },
  "docente@cervantes.edu.ar": {
    id: 2,
    name: "Docente E2E",
    role: "docente",
    identificadorInstitucional: 20001,
    idDocente: 20001,
  },
  "alumno@cervantes.edu.ar": {
    id: 3,
    name: "Alumno E2E",
    role: "alumno",
    identificadorInstitucional: 30001,
    idAlumno: 30001,
  },
};

function send(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);

  if (request.method === "GET" && url.pathname === "/api/health") {
    return send(response, 200, { success: true, data: { service: "examio-e2e-api" } });
  }

  if (request.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJson(request);
    const user = users[String(body.Email).toLowerCase()];
    if (!user || body.Password !== "ExamioE2E2026!") {
      return send(response, 401, {
        success: false,
        message: "Credenciales inválidas",
        code: "INVALID_CREDENTIALS",
      });
    }

    const now = Date.now();
    const accessTokenExpiresAt = new Date(now + 15 * 60_000).toISOString();
    const refreshTokenExpiresAt = new Date(now + 12 * 60 * 60_000).toISOString();
    const accessToken = `e2e-access-${user.role}-${crypto.randomUUID()}`;
    return send(response, 200, {
      success: true,
      data: {
        accessToken,
        token: accessToken,
        refreshToken: `e2e-refresh-${user.role}-${crypto.randomUUID()}`,
        accessTokenExpiresAt,
        refreshTokenExpiresAt,
        user: { ...user, email: body.Email },
      },
    });
  }

  if (request.method === "POST" && url.pathname === "/api/auth/logout") {
    return send(response, 200, { success: true, data: null });
  }

  if (request.method === "POST" && url.pathname === "/api/auth/refresh") {
    const now = Date.now();
    return send(response, 200, {
      success: true,
      data: {
        accessToken: `e2e-access-refreshed-${crypto.randomUUID()}`,
        refreshToken: `e2e-refresh-rotated-${crypto.randomUUID()}`,
        accessTokenExpiresAt: new Date(now + 15 * 60_000).toISOString(),
        refreshTokenExpiresAt: new Date(now + 12 * 60 * 60_000).toISOString(),
      },
    });
  }

  if (
    request.method === "GET" &&
    url.pathname === "/api/docentes/20001/comisiones"
  ) {
    return send(response, 200, {
      success: true,
      data: [
        {
          idComision: 12,
          nombreMateria: "Redes E2E",
          division: "1A",
          docente: "Docente E2E",
          carrera: "Sistemas",
        },
      ],
    });
  }

  if (request.method === "GET" && url.pathname === "/api/materias") {
    return send(response, 200, {
      success: true,
      data: [
        { id: 4, nombre: "Bases de Datos", semestre: 2, idCarrera: 1, estado: true },
      ],
    });
  }

  if (
    request.method === "GET" &&
    url.pathname === "/api/banco-preguntas/etiquetas"
  ) {
    return send(response, 200, { success: true, data: [] });
  }

  if (
    request.method === "GET" &&
    url.pathname === "/api/banco-preguntas/preguntas"
  ) {
    return send(response, 200, {
      success: true,
      data: {
        items: [
          {
            id: 601,
            idDocente: 20001,
            titulo: "Pregunta disponible E2E",
            resumen: "Contenido reutilizable",
            tipo: "abierta",
            estado: "disponible",
            revision: 2,
            fechaCreacion: "2026-09-01T10:00:00.000Z",
            fechaActualizacion: "2026-09-01T10:00:00.000Z",
          },
        ],
        total: 1,
        pagina: 1,
        tamano: 10,
      },
    });
  }

  if (
    request.method === "GET" &&
    url.pathname === "/api/banco-preguntas/grupos"
  ) {
    return send(response, 200, {
      success: true,
      data: { items: [], total: 0, pagina: 1, tamano: 10 },
    });
  }

  if (
    request.method === "POST" &&
    url.pathname === "/api/banco-preguntas/preguntas"
  ) {
    const body = await readJson(request);
    return send(response, 201, {
      success: true,
      data: {
        id: 501,
        idDocente: 20001,
        titulo: body.Titulo,
        enunciado: body.Enunciado ?? "",
        tipo: body.Tipo,
        estado: "borrador",
        revision: 1,
        opciones: body.Opciones ?? [],
        etiquetas: [],
        fechaCreacion: "2026-09-30T10:00:00.000Z",
        fechaActualizacion: "2026-09-30T10:00:00.000Z",
      },
    });
  }

  if (
    request.method === "POST" &&
    url.pathname === "/api/evaluaciones/guardar-completo"
  ) {
    lastDraftRequest = await readJson(request);
    evaluationState = "borrador";
    return send(response, 201, {
      success: true,
      data: {
        idActividad: 70,
        idPublicacion: 77,
        estado: "borrador",
        revision: 1,
        escalaCalificacion: lastDraftRequest?.EscalaCalificacion ?? 10,
        notaAprobacion: lastDraftRequest?.NotaAprobacion ?? 4,
        modoPuntaje: lastDraftRequest?.ModoPuntaje ?? "iguales",
        mostrarPuntajePorPregunta:
          lastDraftRequest?.MostrarPuntajePorPregunta ?? false,
        correccionAutomaticaCerradas:
          lastDraftRequest?.CorreccionAutomaticaCerradas ?? true,
        importaciones: [],
        banco: [],
      },
    });
  }

  if (
    request.method === "GET" &&
    url.pathname === "/api/evaluaciones/77/detalle"
  ) {
    return send(response, 200, {
      success: true,
      data: {
        idActividad: 70,
        idPublicacion: 77,
        titulo: lastDraftRequest?.Titulo ?? "Evaluación banco E2E",
        descripcion: "",
        tipo: "evaluacion",
        duracionMinutos: 90,
        cantidadIntentosMaximos: 1,
        estado: evaluationState,
        revision: evaluationState === "publicada" ? 2 : 1,
        escalaCalificacion: lastDraftRequest?.EscalaCalificacion ?? 10,
        notaAprobacion: lastDraftRequest?.NotaAprobacion ?? 4,
        modoPuntaje: lastDraftRequest?.ModoPuntaje ?? "iguales",
        mostrarPuntajePorPregunta:
          lastDraftRequest?.MostrarPuntajePorPregunta ?? false,
        correccionAutomaticaCerradas:
          lastDraftRequest?.CorreccionAutomaticaCerradas ?? true,
        recursosPermitidos: null,
        idMateriaDivision: 12,
        fechaInicio: "2027-02-10T13:00:00.000Z",
        fechaFin: "2027-02-10T15:00:00.000Z",
        materia: "Redes E2E",
        division: "1A",
        grupos: [
          {
            idGrupo: 301,
            tituloReferencia: "Protocolos",
            puntajeMaximo: 5,
            preguntas: [
              {
                idPregunta: 401,
                enunciado: "Explicá TCP",
                tipo: "abierta",
                idBancoPreguntaOrigen: 501,
                revisionBancoOrigen: 1,
                opciones: [],
              },
            ],
          },
          {
            idGrupo: 302,
            tituloReferencia: "Pregunta disponible E2E",
            puntajeMaximo: 5,
            preguntas: [
              {
                idPregunta: 402,
                enunciado: "Contenido importado",
                tipo: "abierta",
                idBancoPreguntaOrigen: 601,
                revisionBancoOrigen: 2,
                opciones: [],
              },
            ],
          },
        ],
      },
    });
  }

  if (request.method === "GET" && url.pathname === "/api/evaluaciones/47/detalle") {
    return send(response, 200, {
      success: true,
      data: {
        idActividad: 40,
        idPublicacion: 47,
        titulo: "Evaluación E2E",
        tipo: "evaluacion",
        duracionMinutos: 30,
        cantidadIntentosMaximos: 3,
        estado: "publicada",
        revision: 1,
        escalaCalificacion: 10,
        notaAprobacion: 4,
        modoPuntaje: "iguales",
        mostrarPuntajePorPregunta: false,
        correccionAutomaticaCerradas: true,
        fechaInicio: "2026-08-17T12:00:00.000Z",
        fechaFin: "2026-08-17T13:00:00.000Z",
        materia: "Bases de Datos",
        division: "2A",
        grupos: [],
      },
    });
  }

  if (request.method === "GET" && url.pathname === "/api/evaluaciones/47/alumnos") {
    return send(response, 200, {
      success: true,
      data: [
        {
          matricula: 30001,
          nombre: "Alumno",
          apellido: "E2E",
          correo: "alumno@cervantes.edu.ar",
          idIntento: 73,
          estadoIntento: "entregado",
          notaFinal: 8,
          notaAutomatica: 8,
          fechaInicioIntento: "2026-08-17T12:00:00.000Z",
          fechaFinIntento: "2026-08-17T12:30:00.000Z",
          numeroIntento: 2,
          cantidadIntentosMaximos: 3,
          intentosAgotados: false,
        },
      ],
    });
  }

  if (
    request.method === "GET" &&
    url.pathname === "/api/evaluaciones/publicaciones/47/alumnos/30001/intentos"
  ) {
    const validAttempt = selectedValidAttempt ?? 73;
    return send(response, 200, {
      success: true,
      data: [73, 72].map((idIntento, index) => ({
        idIntento,
        idPublicacion: 47,
        idAlumno: 30001,
        numeroIntento: 2 - index,
        estado: "entregado",
        fechaInicio: `2026-08-${17 - index}T12:00:00.000Z`,
        fechaFin: `2026-08-${17 - index}T12:30:00.000Z`,
        notaAutomatica: idIntento === 73 ? 8 : 9,
        notaFinalCalculada: idIntento === 73 ? 8 : 9,
        notaFinalManual: null,
        notaFinal: idIntento === 73 ? 8 : 9,
        escalaCalificacion: 10,
        notaAprobacion: 4,
        estadoCorreccion: "completa",
        preguntasPendientesCorreccion: 0,
        esIntentoValido: idIntento === validAttempt,
        seleccionIntentoValido:
          idIntento === validAttempt
            ? selectedValidAttempt === null
              ? "automatica"
              : "manual"
            : null,
      })),
    });
  }

  if (
    request.method === "PUT" &&
    url.pathname === "/api/evaluaciones/publicaciones/47/alumnos/30001/intento-valido"
  ) {
    const body = await readJson(request);
    selectedValidAttempt = body.IdIntento;
    return send(response, 200, {
      success: true,
      data: {
        idPublicacion: 47,
        idAlumno: 30001,
        idIntento: selectedValidAttempt,
        esIntentoValido: true,
        seleccionIntentoValido: "manual",
      },
    });
  }

  if (
    request.method === "DELETE" &&
    url.pathname === "/api/evaluaciones/publicaciones/47/alumnos/30001/intento-valido"
  ) {
    selectedValidAttempt = null;
    return send(response, 200, {
      success: true,
      data: {
        idPublicacion: 47,
        idAlumno: 30001,
        idIntento: 73,
        esIntentoValido: true,
        seleccionIntentoValido: "automatica",
      },
    });
  }

  if (
    request.method === "POST" &&
    url.pathname === "/api/evaluaciones/70/publicar-completo"
  ) {
    const body = await readJson(request);
    evaluationState = "publicada";
    return send(response, 200, {
      success: true,
      data: {
        idActividad: 70,
        idPublicacion: body.IdPublicacion,
        estado: "publicada",
        revision: 2,
        importaciones: [],
        banco: [],
      },
    });
  }

  if (request.method === "GET" && url.pathname === "/api/evaluaciones/intento/73/renderizar") {
    return send(response, 200, {
      success: true,
      data: [
        { idPregunta: 501, enunciado: "¿Cuál es la respuesta E2E?", tipo: "mc" },
      ],
    });
  }

  if (
    request.method === "GET" &&
    url.pathname === "/api/evaluaciones/pregunta/501/opciones/73"
  ) {
    return send(response, 200, {
      success: true,
      data: [
        { idOpcion: 9001, texto: "Opción persistida", fueSeleccionada: false },
        { idOpcion: 9002, texto: "Otra opción", fueSeleccionada: false },
      ],
    });
  }

  if (request.method === "POST" && url.pathname === "/api/intentos/guardar-respuesta") {
    await readJson(request);
    return send(response, 200, { success: true, data: null });
  }

  if (request.method === "POST" && url.pathname === "/api/telemetria/alerta") {
    await readJson(request);
    return send(response, 200, { success: true, data: null });
  }

  const focusMatch = url.pathname.match(/^\/api\/telemetria\/intentos\/(\d+)\/incidentes\/([0-9a-f-]+)$/i);
  if (request.method === "PUT" && focusMatch) {
    const body = await readJson(request);
    const [, idIntento, eventoId] = focusMatch;
    const existing = focusIncidents.get(eventoId);
    const incident = {
      id: existing?.id ?? focusIncidents.size + 1,
      eventoId,
      idIntento: Number(idIntento),
      tipo: body.Tipo,
      fechaInicioCliente: body.FechaInicioCliente ?? existing?.fechaInicioCliente,
      fechaFinCliente: body.FechaFinCliente ?? null,
      duracionMilisegundos: body.DuracionMilisegundos ?? null,
      fechaRecepcionInicio: existing?.fechaRecepcionInicio ?? new Date().toISOString(),
      fechaRecepcionFin: body.FechaFinCliente ? new Date().toISOString() : null,
      estado: body.FechaFinCliente ? "completado" : "iniciado",
    };
    focusIncidents.set(eventoId, incident);
    return send(response, 200, { success: true, data: incident });
  }

  if (request.method === "GET" && url.pathname === "/api/telemetria/intentos/73/resumen") {
    const values = [...focusIncidents.values()];
    const durations = values.map((item) => item.duracionMilisegundos).filter(Number.isFinite);
    const totalMs = durations.reduce((total, duration) => total + duration, 0);
    return send(response, 200, { success: true, data: {
      cantidadPerdidasFoco: values.length,
      segundosTotalesFuera: totalMs / 1000,
      promedioSegundosFuera: durations.length ? totalMs / durations.length / 1000 : 0,
      maximoSegundosFuera: durations.length ? Math.max(...durations) / 1000 : 0,
    } });
  }

  if (request.method === "GET" && url.pathname === "/api/telemetria/intentos/73/incidentes") {
    return send(response, 200, { success: true, data: [...focusIncidents.values()] });
  }

  if (request.method === "GET" && url.pathname === "/api/intentos/73/completo") {
    return send(response, 200, {
      success: true,
      data: {
        idIntento: 73,
        idAlumno: 30001,
        idPublicacion: 47,
        estado: "entregado",
        notaFinal: null,
        notaAutomatica: null,
        notaFinalCalculada: null,
        notaFinalManual: null,
        escalaCalificacion: 10,
        notaAprobacion: 4,
        fechaInicio: "2026-08-17T12:00:00.000Z",
        fechaFin: "2026-08-17T12:30:00.000Z",
        numeroIntento: 1,
        nombre: "Alumno",
        apellido: "E2E",
        correo: "alumno@cervantes.edu.ar",
        tituloEvaluacion: "Evaluación E2E",
        tipoEvaluacion: "evaluacion",
        duracionMinutos: 30,
        preguntas: [
          {
            idPregunta: 502,
            enunciado: "Explicá el contrato probado",
            tipo: "abierta",
            grupoConceptualmente: "Integración",
            puntajeMaximo: 2,
            puntajeObtenido: null,
            origenCorreccion: null,
            comentariosDocente: null,
            corregidoPor: null,
            fechaCorreccion: null,
            respuesta: {
              idRespuesta: 7001,
              rtaTexto: "Respuesta del alumno",
              esCorrecta: null,
              comentariosDocente: null,
            },
            opciones: [],
          },
        ],
      },
    });
  }

  if (request.method === "GET" && url.pathname === "/api/intentos/mios") {
    return send(response, 200, {
      success: true,
      data: {
        items: [
          {
            idIntento: 73,
            idActividad: 40,
            idPublicacion: 47,
            titulo: "Evaluación E2E",
            tipo: "evaluacion",
            idMateria: 4,
            materia: "Bases de Datos",
            idMateriaDivision: 9,
            division: "2A",
            numeroIntento: 2,
            cantidadIntentosMaximos: 3,
            estado: "entregado",
            fechaInicio: "2026-08-17T12:00:00.000Z",
            fechaFin: "2026-08-17T12:30:00.000Z",
            notaAutomatica: 8,
            notaFinal: 8,
            escalaCalificacion: 10,
            notaAprobacion: 4,
            resultado: "aprobado",
            estadoCorreccion: "completa",
            esIntentoValido: true,
            seleccionIntentoValido: "automatica",
          },
        ],
        resumen: {
          totalIntentos: 2,
          totalEvaluaciones: 1,
          evaluacionesAprobadas: 1,
          evaluacionesDesaprobadas: 0,
          evaluacionesPendientes: 0,
        },
        paginacion: { pagina: 1, limite: 10, total: 2, totalPaginas: 1 },
      },
    });
  }

  if (
    request.method === "PUT" &&
    url.pathname === "/api/intentos/73/preguntas/502/corregir"
  ) {
    const body = await readJson(request);
    if (body.puntajeObtenido !== 1.5 || body.comentariosDocente !== "Respuesta parcial") {
      return send(response, 400, { success: false, message: "Contrato de corrección inválido" });
    }
    return send(response, 200, {
      success: true,
      data: {
        idIntento: 73,
        idPregunta: 502,
        puntajeMaximoSnapshot: 2,
        puntajeObtenido: 1.5,
        origenCorreccion: "manual",
        comentariosDocente: "Respuesta parcial",
        notaAutomatica: null,
        notaFinalCalculada: 1.5,
        notaFinalManual: null,
        notaFinal: 1.5,
        escalaCalificacion: 10,
        notaAprobacion: 4,
      },
    });
  }

  if (request.method === "GET" && url.pathname === "/api/reportes/rendimiento-evaluaciones") {
    return send(response, 200, {
      success: true,
      data: {
        criterios: { alcanceIntentos: "todos", escalaPromedio: 10, conPendientesCorreccion: null },
        kpis: {
          totalEvaluaciones: 0,
          totalAlumnosAlcanzados: 0,
          totalAlumnosUnicos: 0,
          totalIntentos: 0,
          totalEntregados: 0,
          totalEnProgreso: 0,
          totalVencidos: 0,
          totalAnulados: 0,
          totalIntentosAlcanceAcademico: 0,
          totalIntentosCalificados: 0,
          intentosPendientesCorreccion: 0,
          promedioIntentosCalificados: null,
          promedioIntentosCalificadosBase10: null,
          tasaAprobacionIntentos: null,
        },
        graficos: { distribucionResultados: [] },
        evaluaciones: [],
        paginacion: { pagina: 1, limite: 20, total: 0, totalPaginas: 0 },
      },
    });
  }

  if (request.method === "GET" && url.pathname === "/api/reportes/rendimiento") {
    return send(response, 200, {
      success: true,
      data: {
        kpis: { totalAlumnos: 0, promedioGeneral: null, porcentajeAprobacion: null },
        alumnos: [],
        paginacion: { pagina: 1, limite: 20, total: 0, totalPaginas: 0 },
      },
    });
  }

  if (request.method === "GET") {
    return send(response, 200, { success: true, data: [] });
  }

  return send(response, 404, {
    success: false,
    message: `Contrato E2E no definido para ${request.method} ${url.pathname}`,
    code: "E2E_ROUTE_NOT_MOCKED",
  });
});

server.listen(port, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
