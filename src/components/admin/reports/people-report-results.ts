import { obtenerReporteRendimientoEvaluaciones } from "@/services/api/reportes.api";
import type { ReporteEvaluacionesFiltros, ResultadosOficiales } from "@/types";

interface PersonResult {
  code: number;
  nombre: string;
  apellido: string;
  resultadosOficiales: ResultadosOficiales;
}

type PersonScope = Pick<ReporteEvaluacionesFiltros, "fechaDesde" | "fechaHasta" | "idCarrera" | "idMateria" | "idMateriaDivision">;

export async function loadPeopleReportResults(tipo: "alumnos" | "docentes", scope: PersonScope): Promise<PersonResult[]> {
  const results = new Map<number, PersonResult>();
  // Se recupera el conjunto por páginas de personas, nunca una consulta por persona.
  // Búsqueda, estado, orden y paginación locales siguen operando sobre el conjunto completo.
  for (let paginaPersonas = 1; ; paginaPersonas += 1) {
    const response = await obtenerReporteRendimientoEvaluaciones({
      ...scope,
      resumenPersonas: tipo,
      paginaPersonas,
      limitePersonas: 100,
      alcanceIntentos: "validos",
      pagina: 1,
      limite: 1,
    });
    const summary = response.resumenPersonas;
    if (!summary || summary.tipo !== tipo || summary.paginacion.pagina !== paginaPersonas) {
      throw new Error("No se pudieron obtener los resultados oficiales del listado. Reintentá la consulta.");
    }
    if (summary.tipo === "alumnos") {
      for (const item of summary.items) results.set(item.matricula, { ...item, code: item.matricula });
    } else {
      for (const item of summary.items) results.set(item.legajo, { ...item, code: item.legajo });
    }
    if (paginaPersonas >= summary.paginacion.totalPaginas) break;
    if (summary.items.length === 0) throw new Error("La consulta de personas quedó incompleta. Reintentá para recuperar todos los resultados.");
  }
  return [...results.values()];
}
