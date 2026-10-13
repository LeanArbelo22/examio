import type { EvaluacionDocente } from "@/types";

export interface TeacherCommissionGroup {
  idMateriaDivision: number;
  division: string;
  evaluaciones: EvaluacionDocente[];
  alumnosInscriptos: number;
}

export interface TeacherSubjectGroup {
  idMateria: number;
  materia: string;
  carrera: string;
  comisiones: TeacherCommissionGroup[];
  evaluaciones: EvaluacionDocente[];
}

export function groupTeacherEvaluations(
  evaluaciones: EvaluacionDocente[],
): TeacherSubjectGroup[] {
  const materias = new Map<number, TeacherSubjectGroup>();

  for (const evaluacion of evaluaciones) {
    let materia = materias.get(evaluacion.idMateria);

    if (!materia) {
      materia = {
        idMateria: evaluacion.idMateria,
        materia: evaluacion.materia,
        carrera: evaluacion.carrera,
        comisiones: [],
        evaluaciones: [],
      };
      materias.set(evaluacion.idMateria, materia);
    }

    materia.evaluaciones.push(evaluacion);

    let comision = materia.comisiones.find(
      (item) => item.idMateriaDivision === evaluacion.idMateriaDivision,
    );

    if (!comision) {
      comision = {
        idMateriaDivision: evaluacion.idMateriaDivision,
        division: evaluacion.division,
        evaluaciones: [],
        alumnosInscriptos: evaluacion.alumnosInscriptos,
      };
      materia.comisiones.push(comision);
    }

    comision.evaluaciones.push(evaluacion);
    comision.alumnosInscriptos = Math.max(
      comision.alumnosInscriptos,
      evaluacion.alumnosInscriptos,
    );
  }

  return [...materias.values()]
    .map((materia) => ({
      ...materia,
      comisiones: materia.comisiones.sort((a, b) =>
        a.division.localeCompare(b.division, "es", { numeric: true }),
      ),
    }))
    .sort((a, b) => {
      const byName = a.materia.localeCompare(b.materia, "es");
      return byName || a.carrera.localeCompare(b.carrera, "es");
    });
}
