// ============================================================
// ENUMS ESTRICTOS — coinciden bit por bit con CHECK de SQL Server
// ============================================================

export type UserRole = "alumno" | "docente" | "admin";

export type TipoActividad = "evaluacion" | "tp" | "tarea";
export type EstadoActividad = "borrador" | "publicada" | "archivada";
export type TipoPregunta = "mc" | "vf" | "abierta" | "code";
export type EstadoIntento = "en_progreso" | "entregado" | "vencido" | "anulado";
export type EstadoActa = "abierta" | "firmada" | "cerrada";
export type CondicionFinal = "regular" | "promocionado" | "libre";
export type EstadoAlumno = "activo" | "suspendido" | "inactivo";

// ============================================================
// WRAPPER DE RESPUESTA API
// ============================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: Array<{ code: string; path: string[]; message: string }>;
}

// ============================================================
// ENTIDADES — RESPUESTAS API (camelCase: la API transforma
// PascalCase → camelCase vía mapKeysToCamelCase())
// ============================================================

// --- 1. Alumno ---
export interface Alumno {
  matricula: number;
  nombre: string;
  apellido: string;
  cuil: string;
  correo: string;
  estado: EstadoAlumno;
}

// --- 2. Docente ---
export interface Docente {
  legajo: number;
  nombre: string;
  apellido: string;
  cuil: string;
  correo: string;
  estado: boolean;
}

// --- 3. Carrera ---
export interface Carrera {
  id: number;
  nombre: string;
  descripcion: string;
  duracionSemestres: number;
  estado?: boolean;
}

// --- 4. Materia ---
export interface Materia {
  id: number;
  nombre: string;
  semestre: number;
  idCarrera: number;
  estado: boolean;
}

// --- 5. Division ---
export interface Division {
  id: number;
  descripcion: string;
}

// --- 6. MateriaDivision ---
export interface MateriaDivision {
  id: number;
  idMateria: number;
  idDivision: number;
  idDocente?: number;
}

// --- 7. InscripcionMateria ---
export interface InscripcionMateria {
  idMateriaDivision: number;
  idAlumno: number;
}

// --- 8. Actividad ---
export interface Actividad {
  id: number;
  titulo: string;
  descripcion?: string;
  tipo: TipoActividad;
  cantidadIntentosMaximos: number;
  duracionMinutos?: number;
  recursosPermitidos?: string;
  estado: EstadoActividad;
}

// --- 9. Publicacion ---
export interface Publicacion {
  id: number;
  idActividad: number;
  idMateriaDivision: number;
  fechaInicio: string;
  fechaFin: string;
  visible: boolean;
}

// --- 10. GrupoPregunta ---
export interface GrupoPregunta {
  id: number;
  idActividad: number;
  tituloReferencia: string;
}

// --- 11. Pregunta ---
export interface Pregunta {
  id: number;
  idGrupoPregunta: number;
  enunciado: string;
  tipo: TipoPregunta;
}

// --- 12. Opcion ---
export interface Opcion {
  id: number;
  idPregunta: number;
  texto: string;
  esCorrecta: boolean;
}

// --- 13. Intento ---
export interface Intento {
  id: number;
  idPublicacion: number;
  idAlumno: number;
  numeroIntento: number;
  fechaInicio: string;
  fechaFin?: string;
  estado: EstadoIntento;
  notaFinal?: number;
}

// --- 14. IntentoPregunta ---
export interface IntentoPregunta {
  id: number;
  idIntento: number;
  idPregunta: number;
}

// --- 15. Respuesta ---
export interface Respuesta {
  id: number;
  idIntento: number;
  idPregunta: number;
  rtaTexto?: string;
}

// --- 16. RespuestaOpcion ---
export interface RespuestaOpcion {
  idRespuesta: number;
  idOpcion: number;
}

// --- 17. HistorialRespuesta ---
export interface HistorialRespuesta {
  id: number;
  idRespuesta: number;
  idOpcionAnterior: number;
  idOpcionNueva: number;
  fechaCambio: string;
}

// --- 18. AlertaFraude ---
export interface AlertaFraude {
  id: number;
  idIntento: number;
  tipoIncidente: string;
  detalle?: string;
  timestamp: string;
}

// --- 19. MetricasNavegacion ---
export interface MetricasNavegacion {
  id: number;
  idIntento: number;
  idPregunta: number;
  fechaIngreso: string;
  fechaEgreso?: string;
  segundosPermanencia: number;
}

// --- 20. ActaMateria ---
export interface ActaMateria {
  id: number;
  idMateriaDivision: number;
  fechaCierre?: string;
  libro: string;
  folio: string;
  estado: EstadoActa;
}

// --- 21. DetalleActa ---
export interface DetalleActa {
  idActa: number;
  idAlumno: number;
  notaCursada: number;
  notaFinalExamen?: number;
  condicionFinal: CondicionFinal;
}

// --- 22. Usuario ---
export interface Usuario {
  id: number;
  email: string;
  rol: UserRole;
  idDocente?: number;
  idAlumno?: number;
  activo: boolean;
}

// ============================================================
// VISTAS / REPORTES (respuestas compuestas de SPs)
// ============================================================

export interface Comision {
  idMateriaDivision: number;
  materia: string;
  division: string;
  docenteAsignado: string;
}

export interface ComisionMateria {
  idComision: number;
  division: string;
  docenteAsignado: string;
}

export interface AlumnoMateria {
  materia: string;
  matricula: number;
  nombreAlumno: string;
  division: string;
}

export interface MateriaPlan {
  nombreMateria: string;
  nroSemestre: number;
}

export interface AlumnoInscripto {
  matricula: number;
  nombreAlumno: string;
  carrera: string;
}

export interface MateriaDocente {
  idComision: number;
  nombreMateria: string;
  carrera: string;
  division: string;
}

export interface ComisionDocente {
  idComision: number;
  nombreMateria: string;
  division: string;
  docente: string;
  carrera: string;
}

// --- EVALUACIONES EN VIVO ---

export interface PreguntaSorteada {
  idPregunta: number;
  enunciado: string;
  tipo: TipoPregunta;
  grupoConceptualmente?: string;
}

export interface OpcionSorteada {
  idOpcion: number;
  texto: string;
  esCorrecta?: boolean;
  fueSeleccionada?: boolean;
}

export interface IntentoExamen {
  idIntento: number;
  idPublicacion: number;
  idAlumno: number;
  fechaInicio: string;
  fechaFin?: string;
  estado: EstadoIntento;
  nota?: number;
}

export interface AlertaAntifraude {
  idAlerta: number;
  idIntento: number;
  tipoIncidente: string;
  detalle: string;
  fechaRegistro: string;
}

export interface EvaluacionDocente {
  idPublicacion: number;
  idActividad: number;
  titulo: string;
  descripcion?: string;
  tipo: TipoActividad;
  materia: string;
  carrera: string;
  division: string;
  fechaInicio: string;
  fechaFin: string;
  duracionMinutos: number;
  cantidadIntentosMaximos: number;
  recursosPermitidos: string | null;
  estado: EstadoActividad;
  alumnosInscriptos: number;
  totalIntentos: number;
}

export interface OpcionDetalle {
  idOpcion: number;
  texto: string;
  esCorrecta: boolean;
}

export interface PreguntaDetalle {
  idPregunta: number;
  enunciado: string;
  tipo: TipoPregunta;
  opciones: OpcionDetalle[];
}

export interface GrupoPreguntaDetalle {
  idGrupo: number;
  tituloReferencia: string;
  preguntas: PreguntaDetalle[];
}

export interface EvaluacionDetalle {
  idActividad: number;
  titulo: string;
  descripcion?: string;
  tipo: TipoActividad;
  duracionMinutos: number;
  cantidadIntentosMaximos: number;
  estado: EstadoActividad;
  recursosPermitidos: string | null;
  idPublicacion: number;
  fechaInicio: string;
  fechaFin: string;
  materia: string;
  division: string;
  grupos: GrupoPreguntaDetalle[];
}

export interface OpcionIntento {
  idOpcion: number;
  texto: string;
  esCorrecta: boolean;
  fueSeleccionada: boolean | number;
}

export interface RespuestaIntento {
  idRespuesta: number;
  rtaTexto: string | null;
  opcionesSeleccionadas: OpcionIntento[];
  esCorrecta?: boolean | null;
  comentariosDocente?: string | null;
}

export interface PreguntaIntento {
  idPregunta: number;
  enunciado: string;
  tipo: TipoPregunta;
  grupoConceptualmente: string;
  respuesta: RespuestaIntento;
  opciones: OpcionIntento[];
}

export interface IntentoCompleto {
  idIntento: number;
  idAlumno: number;
  idPublicacion: number;
  estado: EstadoIntento;
  notaFinal: number | null;
  notaAutomatica: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  numeroIntento: number;
  nombre: string;
  apellido: string;
  correo: string;
  tituloEvaluacion: string;
  tipoEvaluacion: string;
  duracionMinutos: number;
  preguntas: PreguntaIntento[];
}

export interface AlumnoIntento {
  matricula: number;
  nombre: string;
  apellido: string;
  correo: string;
  idIntento: number | null;
  estadoIntento: string | null;
  notaFinal: number | null;
  notaAutomatica: number | null;
  fechaInicioIntento: string | null;
  fechaFinIntento: string | null;
  numeroIntento: number | null;
  cantidadIntentosMaximos: number;
  intentosAgotados: boolean;
}

// --- DETALLE DE EVALUACIÓN (plantilla maestra del profesor) ---

export interface OpcionDetalle {
  idOpcion: number;
  texto: string;
  esCorrecta: boolean;
}

export interface PreguntaDetalle {
  idPregunta: number;
  enunciado: string;
  tipo: TipoPregunta;
  opciones: OpcionDetalle[];
}

export interface GrupoPreguntaDetalle {
  idGrupo: number;
  tituloReferencia: string;
  preguntas: PreguntaDetalle[];
}

export interface EvaluacionDetalle {
  idActividad: number;
  titulo: string;
  descripcion?: string;
  tipo: TipoActividad;
  duracionMinutos: number;
  cantidadIntentosMaximos: number;
  estado: EstadoActividad;
  recursosPermitidos: string | null;
  idPublicacion: number;
  fechaInicio: string;
  fechaFin: string;
  materia: string;
  division: string;
  grupos: GrupoPreguntaDetalle[];
}

export interface RespuestaIntento {
  idRespuesta: number;
  rtaTexto: string | null;
  opcionesSeleccionadas: OpcionIntento[];
  esCorrecta?: boolean | null;
  comentariosDocente?: string | null;
}

export interface PreguntaIntento {
  idPregunta: number;
  enunciado: string;
  tipo: TipoPregunta;
  grupoConceptualmente: string;
  respuesta: RespuestaIntento;
  opciones: OpcionIntento[];
}

export interface IntentoCompleto {
  idIntento: number;
  idAlumno: number;
  idPublicacion: number;
  estado: EstadoIntento;
  notaFinal: number | null;
  notaAutomatica: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  numeroIntento: number;
  nombre: string;
  apellido: string;
  correo: string;
  tituloEvaluacion: string;
  tipoEvaluacion: string;
  duracionMinutos: number;
  preguntas: PreguntaIntento[];
}

export interface EstadisticasAlumno {
  totalCorregidos: number | null;
  promedioGeneral: number | null;
  aprobados: number | null;
  porcentajeAprobacion: number | null;
}

export interface IntentoDetallado {
  idIntento: number;
  idAlumno: number;
  idPublicacion: number;
  estado: EstadoIntento;
  notaFinal: number | null;
  notaAutomatica: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  numeroIntento: number;
  tituloEvaluacion: string;
  tipoEvaluacion: string;
  duracionMinutos: number;
  materia: string;
  division: string;
}

export interface HistorialCorregidoItem {
  idIntento: number;
  tituloEvaluacion: string;
  materia: string;
  division: string;
  fechaFin: string;
  notaFinal: number | null;
  numeroIntento: number;
}

export interface EvaluacionPendiente {
  idPublicacion: number;
  titulo: string;
  materia: string;
  carrera: string;
  docente: string;
  fechaInicio: string;
  fechaFin: string;
  duracionMinutos: number;
  recursosPermitidos: string | null;
  cantidadIntentosMaximos: number;
  intentosRealizados: number;
  estadoUltimoIntento: string | null;
  enProgreso: boolean;
  puedeReintentar: boolean;
  intentosAgotados: boolean;
}

// ============================================================
// REQUEST PAYLOADS — PascalCase (coinciden con Zod schemas)
// ============================================================

// --- Auth ---
export interface LoginPayload {
  Email: string;
  Password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    role: UserRole;
    identificadorInstitucional?: number;
  };
}

// --- Alumnos ---
export interface CreateAlumnoPayload {
  Matricula: number;
  Nombre: string;
  Apellido: string;
  Cuil?: string;
  Correo: string;
}

export type UpdateAlumnoPayload = Partial<CreateAlumnoPayload>;

// --- Docentes ---
export interface CreateDocentePayload {
  Legajo: number;
  Nombre: string;
  Apellido: string;
  Cuil?: string;
  Correo: string;
}

export type UpdateDocentePayload = Partial<CreateDocentePayload>;

// --- Carreras ---
export interface CreateCarreraPayload {
  Nombre: string;
  Descripcion?: string;
  DuracionSemestres?: number;
}

export type UpdateCarreraPayload = Partial<CreateCarreraPayload>;

// --- Materias ---
export interface CreateMateriaPayload {
  Nombre: string;
  Semestre?: number;
  IdCarrera: number;
}

export type UpdateMateriaPayload = Partial<CreateMateriaPayload>;

// --- Divisiones ---
export interface CreateDivisionPayload {
  Descripcion: string;
}

// --- Asignaciones ---
export interface AsignarComisionPayload {
  IdMateriaDivision: number;
}

export interface AsignarDivisionPayload {
  Id: number;
}

// --- Evaluaciones ---
export interface OpcionPayload {
  Texto: string;
  EsCorrecta: boolean;
}

export interface PreguntaPayload {
  Enunciado: string;
  Tipo: TipoPregunta;
  Opciones?: OpcionPayload[];
}

export interface GrupoPreguntaPayload {
  TituloReferencia: string;
  Variantes: PreguntaPayload[];
}

export interface GuardarEvaluacionPayload {
  Titulo: string;
  Descripcion?: string;
  Tipo: TipoActividad;
  CantidadIntentosMaximos: number;
  DuracionMinutos: number | null;
  RecursosPermitidos?: string;
  IdMateriaDivision: number;
  FechaInicio: string;
  FechaFin: string;
  GruposPreguntas: GrupoPreguntaPayload[];
}

// --- Intentos ---
export interface IniciarIntentoPayload {
  IdPublicacion: number;
  IdAlumno: number;
}

export interface GuardarRespuestaPayload {
  IdIntento: number;
  IdPregunta: number;
  IdOpcionNueva?: number;
  RtaTexto?: string;
}

// --- Usuarios ---
export interface CreateUsuarioPayload {
  Email: string;
  PasswordHash: string;
  Rol: UserRole;
  IdDocente?: number;
  IdAlumno?: number;
  Activo: boolean;
}

export type UpdateUsuarioPayload = Partial<CreateUsuarioPayload>;

// --- Actas ---
export interface CreateActaPayload {
  IdMateriaDivision: number;
  Libro: string;
  Folio: string;
}

export interface CargarDetalleActaPayload {
  IdActa: number;
  IdAlumno: number;
  NotaCursada: number;
  NotaFinalExamen?: number | null;
  CondicionFinal: CondicionFinal;
}

// ============================================================
// ADMIN — Dashboard Analítico
// ============================================================

export interface AdminAnalyticsKPIs {
  totalIntentos: number;
  promedioGeneral: number;
  tasaAprobacion: number;
  totalAlertasFraude: number;
}

export interface AdminIntentoItem {
  idIntento: number;
  matricula: number;
  nombreAlumno: string;
  tituloEvaluacion: string;
  comisionMateria: string;
  fechaInicio: string;
  estado: string;
  notaFinal: number;
  totalAlertas: number;
}

export interface AdminEvaluacionItem {
  legajoDocente: number;
  nombreDocente: string;
  tituloEvaluacion: string;
  nombreMateria: string;
  nombreDivision: string;
  fechaPublicacion: string;
  estado: string;
  alumnosInscriptos: number;
}

export interface AdminAnalyticsResponse {
  kpis: AdminAnalyticsKPIs;
  intentos: AdminIntentoItem[];
  evaluaciones: AdminEvaluacionItem[];
}

// ============================================================
// REPORTES — Rendimiento por Alumno
// ============================================================

export type ReporteRendimientoEstado = "entregado" | "en_progreso" | "vencido";
export type ReporteRendimientoOrden = "alumno" | "promedio" | "aprobados" | "intentos";
export type OrdenDireccion = "asc" | "desc";

export interface ReporteRendimientoFiltros {
  matricula?: string;
  idMateria?: string;
  idMateriaDivision?: string;
  idActividad?: string;
  estado?: ReporteRendimientoEstado | "";
  fechaDesde?: string;
  fechaHasta?: string;
  promedioMin?: string;
  promedioMax?: string;
  ordenarPor?: ReporteRendimientoOrden;
  ordenDireccion?: OrdenDireccion;
  pagina?: number;
  limite?: number;
}

export interface ReporteRendimientoPaginacion {
  pagina: number;
  limite: number;
  total: number;
  totalPaginas: number;
}

export interface ReporteRendimientoKpis {
  totalAlumnos: number;
  conIntentos: number;
  totalIntentos: number;
  promedioGeneral: number;
  tasaAprobacion: number;
}

export interface ReporteRendimientoAlumno {
  matricula: number;
  nombre: string;
  apellido: string;
  totalIntentos: number;
  totalCorregidos: number;
  promedio: number;
  aprobados: number;
  desaprobados: number;
  porcentajeAprobacion: number;
}

export interface ReporteRendimientoListado {
  paginacion: ReporteRendimientoPaginacion;
  kpis: ReporteRendimientoKpis;
  alumnos: ReporteRendimientoAlumno[];
}

export interface ReporteRendimientoDetalleKpis {
  totalIntentos: number;
  totalCorregidos: number;
  promedioGeneral: number;
  aprobados: number;
  desaprobados: number;
  porcentajeAprobacion: number;
}

export interface ReporteMejorIntento {
  numeroIntento: number;
  notaFinal: number;
  notaAutomatica: number | null;
  fechaFin: string;
}

export interface ReporteActividadAlumno {
  idActividad: number;
  titulo: string;
  tipo: TipoActividad;
  materia: string;
  division: string;
  intentos: number;
  notaMaxima: number;
  notaPromedio: number;
  mejorIntento: ReporteMejorIntento | null;
}

export interface ReporteRendimientoDetalle {
  alumno: Pick<Alumno, "matricula" | "nombre" | "apellido">;
  kpis: ReporteRendimientoDetalleKpis;
  actividades: ReporteActividadAlumno[];
}

// --- Telemetría ---
export interface AlertaPayload {
  IdIntento: number;
  TipoIncidente: string;
  Detalle?: string;
}

export interface NavegacionPayload {
  IdIntento: number;
  IdPregunta: number;
  SegundosPermanencia: number;
}
