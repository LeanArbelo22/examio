export const isValidId = (value: number | null | undefined): value is number =>
  Number.isInteger(value) && (value ?? 0) > 0;

export const alumnoKeys = {
  all: ["alumnos"] as const,
  detail: (matricula: number) => [...alumnoKeys.all, "detail", matricula] as const,
  materias: (matricula: number) => [...alumnoKeys.detail(matricula), "materias"] as const,
  pendientes: (matricula: number) => [...alumnoKeys.detail(matricula), "pendientes"] as const,
  estadisticas: (matricula: number) => [...alumnoKeys.detail(matricula), "estadisticas"] as const,
  intentos: (matricula: number) => [...alumnoKeys.detail(matricula), "intentos"] as const,
  intentosDetallados: (matricula: number) => [...alumnoKeys.intentos(matricula), "detallados"] as const,
  historialCorregido: (matricula: number) => [...alumnoKeys.intentos(matricula), "historial-corregido"] as const,
};

export const carreraKeys = {
  all: ["carreras"] as const,
  plan: (id: number) => [...carreraKeys.all, id, "plan"] as const,
  alumnos: (id: number) => [...carreraKeys.all, id, "alumnos"] as const,
};

export const materiaKeys = {
  all: ["materias"] as const,
  comisiones: (id: number) => [...materiaKeys.all, id, "comisiones"] as const,
  alumnos: (id: number) => [...materiaKeys.all, id, "alumnos"] as const,
};

export const comisionKeys = {
  all: ["comisiones"] as const,
  alumnos: (id: number) => [...comisionKeys.all, id, "alumnos"] as const,
};

export const docenteKeys = {
  all: ["docentes"] as const,
  estado: (estado: boolean) => [...docenteKeys.all, "estado", estado] as const,
  materias: (legajo: number) => [...docenteKeys.all, legajo, "materias"] as const,
  comisiones: (legajo: number) => [...docenteKeys.all, legajo, "comisiones"] as const,
  evaluaciones: (legajo: number) => [...docenteKeys.all, legajo, "evaluaciones"] as const,
};

export const divisionKeys = {
  all: ["divisiones"] as const,
  detail: (id: number) => [...divisionKeys.all, id] as const,
};

export const usuarioKeys = { all: ["usuarios"] as const };
export const actaKeys = {
  all: ["actas"] as const,
  detail: (id: number) => [...actaKeys.all, id] as const,
};

export const evaluacionKeys = {
  all: ["evaluaciones"] as const,
  detail: (id: number) => [...evaluacionKeys.all, id, "detalle"] as const,
  alumnos: (idPublicacion: number) => [...evaluacionKeys.all, idPublicacion, "alumnos"] as const,
  sorteo: (idIntento: number) => [...evaluacionKeys.all, "intentos", idIntento, "sorteo"] as const,
  opciones: (idIntento: number, idPregunta: number) =>
    [...evaluacionKeys.all, "intentos", idIntento, "preguntas", idPregunta, "opciones"] as const,
};

export const intentoKeys = {
  all: ["intentos"] as const,
  detail: (id: number) => [...intentoKeys.all, id, "completo"] as const,
  alertas: (id: number) => [...intentoKeys.all, id, "alertas"] as const,
};

export const adminKeys = {
  analitica: (filtros: Record<string, string>) => ["admin", "analitica", filtros] as const,
};

export const reporteKeys = {
  all: ["reportes"] as const,
  rendimiento: ["reportes", "rendimiento"] as const,
  listado: (filtros: object) => [...reporteKeys.rendimiento, "listado", filtros] as const,
  detalle: (matricula: number, filtros: object) =>
    [...reporteKeys.rendimiento, "detalle", matricula, filtros] as const,
  rendimientoEvaluaciones: ["reportes", "rendimiento-evaluaciones"] as const,
  evaluaciones: (filtros: object) =>
    [...reporteKeys.rendimientoEvaluaciones, "listado", filtros] as const,
};
