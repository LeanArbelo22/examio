"use client";

import { useState } from "react";
import { useGetAlumnosInscriptos, useGetPlanDeEstudio } from "@/hooks/useCarreras";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

interface DetalleCarreraModalProps {
  carreraId: number;
}

export const DetalleCarreraModal = ({ carreraId }: DetalleCarreraModalProps) => {
  const [activeTab, setActiveTab] = useState<"plan" | "alumnos">("plan");

  const { plan, isLoadingPlan, isErrorPlan } = useGetPlanDeEstudio(carreraId);
  const { alumnos, isLoadingAlumnos, isErrorAlumnos } = useGetAlumnosInscriptos(carreraId);

  return (
    <div className="space-y-4 antialiased">
      {/* Botones de Navegación de Pestañas */}
      <div className="border-b border-slate-100">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("plan")}
            className={`pb-3 px-1 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors duration-150 ${
              activeTab === "plan" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Plan de Estudio
          </button>
          <button
            onClick={() => setActiveTab("alumnos")}
            className={`pb-3 px-1 border-b-2 font-bold text-xs uppercase tracking-wider transition-colors duration-150 ${
              activeTab === "alumnos" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Alumnos Matriculados
          </button>
        </nav>
      </div>

      {/* Contenido Condicional Reducido */}
      <div className="pt-2">
        {activeTab === "plan" && (
          isLoadingPlan ? (
            <p className="text-xs font-semibold text-slate-400 text-center py-4">Sincronizando materias con la API...</p>
          ) : isErrorPlan ? (
            <ErrorMessage message="Error al procesar el plan de estudio." />
          ) : (
            <div className="space-y-2 divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
              {plan && plan.length > 0 ? (
                plan.map((materia) => (
                  <div key={`${materia.nombreMateria}-${materia.nroSemestre}`} className="py-2.5 first:pt-0 flex justify-between items-center">
                    <h4 className="font-bold text-slate-700 text-sm">{materia.nombreMateria}</h4>
                    <span className="text-[11px] font-mono font-bold bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                      Semestre {materia.nroSemestre}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">No hay materias asignadas a este plan curricular.</p>
              )}
            </div>
          )
        )}

        {activeTab === "alumnos" && (
          isLoadingAlumnos ? (
            <p className="text-xs font-semibold text-slate-400 text-center py-4">Buscando nómina de alumnos matriculados...</p>
          ) : isErrorAlumnos ? (
            <ErrorMessage message="Error al cargar los alumnos inscritos." />
          ) : (
            <div className="space-y-2 divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
              {alumnos && alumnos.length > 0 ? (
                alumnos.map((alumno) => (
                  <div key={alumno.matricula} className="py-2.5 first:pt-0 flex justify-between items-center">
                    <p className="font-bold text-slate-700 text-sm">{alumno.nombreAlumno}</p>
                    <p className="text-[11px] font-mono font-bold bg-indigo-50 border border-indigo-100/30 text-indigo-700 px-2 py-0.5 rounded-md">
                      Leg: {alumno.matricula}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">La cohorte actual no registra alumnos inscriptos.</p>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};
