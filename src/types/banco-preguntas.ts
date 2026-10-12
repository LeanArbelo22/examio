import type {
  EstrategiaCorreccion,
  ModoJustificacion,
  TipoPregunta,
  TratamientoJustificacion,
} from "./shared";

export type EstadoBanco = "borrador" | "disponible" | "archivado";

export interface BancoPreguntaFiltros {
  idDocente?: number;
  texto?: string;
  estado?: EstadoBanco;
  tipo?: TipoPregunta;
  etiqueta?: number;
  pagina?: number;
  tamano?: number;
}

export type BancoGrupoFiltros = Omit<BancoPreguntaFiltros, "tipo">;

export interface BancoListaPaginada<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
}

export interface BancoEtiqueta {
  id: number;
  nombre: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface BancoPreguntaListado {
  id: number;
  idDocente: number;
  titulo: string;
  resumen: string;
  tipo: TipoPregunta;
  estado: EstadoBanco;
  revision: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface BancoGrupoListado {
  id: number;
  idDocente: number;
  tituloReferencia: string;
  estado: EstadoBanco;
  revision: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface BancoOpcion {
  id: number;
  texto: string;
  esCorrecta: boolean;
  posicion: number;
}

export interface BancoGrupoAfectado {
  id: number;
  revision: number;
}

export interface BancoPreguntaDetalle
  extends Omit<BancoPreguntaListado, "resumen"> {
  enunciado: string;
  modoJustificacion?: ModoJustificacion;
  estrategiaCorreccion?: EstrategiaCorreccion;
  tratamientoJustificacion?: TratamientoJustificacion;
  contenidoHash?: string | null;
  opciones: BancoOpcion[];
  etiquetas: BancoEtiqueta[];
  gruposAfectados?: BancoGrupoAfectado[];
}

export interface BancoPreguntaEnGrupo {
  id: number;
  titulo: string;
  tipo: TipoPregunta;
  estado: EstadoBanco;
  revision: number;
  posicion: number;
}

export interface BancoGrupoDetalle extends BancoGrupoListado {
  preguntas: BancoPreguntaEnGrupo[];
  etiquetas: BancoEtiqueta[];
  gruposAfectados?: BancoGrupoAfectado[];
}

export interface BancoOpcionPayload {
  Texto: string;
  EsCorrecta: boolean;
}

export interface BancoPreguntaPayload {
  Titulo: string;
  Enunciado?: string;
  Tipo: TipoPregunta;
  ModoJustificacion?: ModoJustificacion;
  EstrategiaCorreccion?: EstrategiaCorreccion;
  TratamientoJustificacion?: TratamientoJustificacion;
  Estado?: EstadoBanco;
  Opciones?: BancoOpcionPayload[];
  Etiquetas?: number[];
}

export interface BancoPreguntaUpdatePayload extends BancoPreguntaPayload {
  RevisionEsperada: number;
}

export interface BancoGrupoPayload {
  TituloReferencia: string;
  Estado?: EstadoBanco;
  Preguntas?: number[];
  Etiquetas?: number[];
}

export interface BancoGrupoUpdatePayload extends BancoGrupoPayload {
  RevisionEsperada: number;
}

export interface BancoEstadoPayload {
  Estado: EstadoBanco;
  RevisionEsperada: number;
}

export interface BancoEtiquetaPayload {
  Nombre: string;
}

export interface BancoPreguntaGrupoExistentePayload {
  Origen: "existente";
  IdPregunta: number;
  RevisionEsperada: number;
}

export interface BancoPreguntaGrupoNuevaPayload {
  Origen: "nueva";
  ClaveCliente: string;
  Pregunta: Omit<BancoPreguntaPayload, "Estado">;
}

export type BancoPreguntaGrupoPayload =
  | BancoPreguntaGrupoExistentePayload
  | BancoPreguntaGrupoNuevaPayload;

export interface BancoGrupoDesdeContenidoPayload {
  TituloReferencia: string;
  Etiquetas?: number[];
  Preguntas: BancoPreguntaGrupoPayload[];
}

export interface BancoGrupoDesdeContenidoResultado {
  grupo: Pick<BancoGrupoDetalle, "id" | "revision" | "estado">;
  preguntas: Array<{
    claveCliente: string;
    id: number;
    revision: number;
  }>;
}

export interface BancoReferenciaPreguntaPayload {
  IdPregunta: number;
  RevisionEsperada: number;
}

export interface BancoReferenciaGrupoPayload {
  IdGrupo: number;
  RevisionEsperada: number;
}

export interface BancoImportarPreguntaPayload
  extends BancoReferenciaPreguntaPayload {
  Tipo: "pregunta";
  TituloReferencia: string;
}

export interface BancoImportarGrupoPayload {
  Tipo: "grupo";
  IdGrupo: number;
  RevisionEsperada: number;
  Preguntas: BancoReferenciaPreguntaPayload[];
}

export type BancoImportacionPayload =
  | BancoImportarPreguntaPayload
  | BancoImportarGrupoPayload;

export interface BancoImportarEnEvaluacionPayload {
  ImportacionesBanco: BancoImportacionPayload[];
}

export interface BancoOpcionImportada {
  idOpcion: number;
  idBancoOpcion: number;
}

export interface BancoPreguntaImportada {
  idPregunta: number;
  idBancoPregunta: number;
  revisionBancoOrigen: number;
  opciones: BancoOpcionImportada[];
}

export interface BancoImportacionResultado {
  idGrupo: number;
  idBancoGrupo: number | null;
  preguntas: BancoPreguntaImportada[];
}

export interface BancoImportarEnEvaluacionResultado {
  importaciones: BancoImportacionResultado[];
  revision: number;
}

export interface BancoDesdeEvaluacionPayload {
  IdActividad: number;
  Preguntas?: number[];
  Grupos?: number[];
}

export interface BancoPreguntaDesdeEvaluacion {
  idPreguntaOrigen: number;
  idBancoPregunta: number;
}

export interface BancoGrupoDesdeEvaluacion {
  idGrupoOrigen: number;
  idBancoGrupo: number;
  preguntas: BancoPreguntaDesdeEvaluacion[];
}

export interface BancoDesdeEvaluacionResultado {
  preguntas: BancoPreguntaDesdeEvaluacion[];
  grupos: BancoGrupoDesdeEvaluacion[];
}

export interface BancoOperacionIdempotente<TPayload> {
  payload: TPayload;
  idempotencyKey: string;
}
