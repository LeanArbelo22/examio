"use client";

import type { Dispatch, SetStateAction } from "react";

interface AdminFiltersProps {
  filtros: Record<string, string>;
  setFiltros: Dispatch<SetStateAction<Record<string, string>>>;
}

const campos = [
  { key: "idCarrera", label: "Carrera", placeholder: "ID Carrera" },
  { key: "idMateria", label: "Materia", placeholder: "ID Materia" },
  { key: "idMateriaDivision", label: "Comisión", placeholder: "ID Comisión" },
  { key: "legajoDocente", label: "Docente", placeholder: "Legajo" },
  { key: "matriculaAlumno", label: "Alumno", placeholder: "Matrícula" },
];

function SearchIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

export function AdminFilters({ filtros, setFiltros }: AdminFiltersProps) {
  const actualizar = (key: string, value: string) => {
    setFiltros((prev) => ({ ...prev, [key]: value }));
  };

  const limpiar = () => {
    setFiltros({ idCarrera: "", idMateria: "", idMateriaDivision: "", legajoDocente: "", matriculaAlumno: "" });
  };

  const hayFiltros = Object.values(filtros).some((v) => v !== "");

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <SearchIcon />
          Filtros de Búsqueda
        </div>
        {hayFiltros && (
          <button onClick={limpiar} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider transition-colors">
            Limpiar filtros
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        {campos.map(({ key, label, placeholder }) => (
          <div key={key} className="flex flex-col gap-1 min-w-[130px]">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</label>
            <input
              type="text"
              placeholder={placeholder}
              value={filtros[key] ?? ""}
              onChange={(e) => actualizar(key, e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 outline-none transition-all placeholder:text-slate-300"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
