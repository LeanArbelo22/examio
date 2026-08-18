import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 55813);

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
            respuesta: {
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

  if (
    request.method === "PUT" &&
    url.pathname === "/api/intentos/73/preguntas/502/corregir"
  ) {
    await readJson(request);
    return send(response, 200, { success: true, data: null });
  }

  if (request.method === "GET" && url.pathname === "/api/reportes/rendimiento-evaluaciones") {
    return send(response, 200, {
      success: true,
      data: {
        kpis: {
          totalEvaluaciones: 0,
          totalAlumnosAlcanzados: 0,
          totalAlumnosUnicos: 0,
          totalIntentos: 0,
          totalEntregados: 0,
          totalEnProgreso: 0,
          totalVencidos: 0,
          totalAnulados: 0,
          totalIntentosCalificados: 0,
          intentosPendientesCorreccion: 0,
          promedioIntentosCalificados: null,
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
