"use client";

import { useState } from "react";
import type { AdminIntentoItem, AdminEvaluacionItem } from "@/types/index";

interface AdminTabsProps {
  intentos: AdminIntentoItem[];
  evaluaciones: AdminEvaluacionItem[];
}

function ClipboardListIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function getEstadoBadge(estado: string) {
  const map: Record<string, string> = {
    entregado: "bg-emerald-50 text-emerald-600 border-emerald-100",
    en_progreso: "bg-amber-50 text-amber-600 border-amber-100",
    vencido: "bg-slate-50 text-slate-500 border-slate-200",
    anulado: "bg-red-50 text-red-600 border-red-100",
    publicada: "bg-indigo-50 text-indigo-600 border-indigo-100",
    borrador: "bg-slate-100 text-slate-500 border-slate-200",
    archivada: "bg-rose-50 text-rose-600 border-rose-100",
  };
  return map[estado] ?? "bg-slate-50 text-slate-500 border-slate-200";
}

function formatoFecha(iso: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function AdminTabs({ intentos, evaluaciones }: AdminTabsProps) {
  const [tab, setTab] = useState<"intentos" | "evaluaciones">("intentos");

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_2px_8px_rgba(0,0,0,0.01)] overflow-hidden">
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setTab("intentos")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            tab === "intentos"
              ? "text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/30"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <ClipboardListIcon />
          Intentos de Alumnos
        </button>
        <button
          onClick={() => setTab("evaluaciones")}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
            tab === "evaluaciones"
              ? "text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/30"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <UsersIcon />
          Evaluaciones Docentes
        </button>
      </div>

      <div className="overflow-x-auto">
        {tab === "intentos" ? (
          <IntentosTable intentos={intentos} />
        ) : (
          <EvaluacionesTable evaluaciones={evaluaciones} />
        )}
      </div>
    </div>
  );
}

function IntentosTable({ intentos }: { intentos: AdminIntentoItem[] }) {
  if (intentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <ClipboardListIcon />
        <p className="text-sm font-medium mt-3">No hay intentos registrados</p>
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/50">
          <th className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Alumno</th>
          <th className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Evaluación</th>
          <th className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Comisión</th>
          <th className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
          <th className="text-center px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Alertas</th>
          <th className="text-center px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Estado</th>
          <th className="text-right px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Nota Final</th>
        </tr>
      </thead>
      <tbody>
        {intentos.map((it) => (
          <tr key={it.idIntento} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="px-4 py-3">
              <p className="font-bold text-slate-800">{it.nombreAlumno}</p>
              <p className="text-[10px] text-slate-400">Mat. {it.matricula}</p>
            </td>
            <td className="px-4 py-3 text-slate-700 font-medium">{it.tituloEvaluacion}</td>
            <td className="px-4 py-3 text-slate-500">{it.comisionMateria}</td>
            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatoFecha(it.fechaInicio)}</td>
            <td className="px-4 py-3 text-center">
              {it.totalAlertas > 0 ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold">
                  <AlertCircleIcon />
                  {it.totalAlertas}
                </span>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </td>
            <td className="px-4 py-3 text-center">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getEstadoBadge(it.estado)}`}>
                {it.estado === "en_progreso" ? "En Progreso" : it.estado.charAt(0).toUpperCase() + it.estado.slice(1)}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <span className="text-sm font-black text-slate-800">{it.notaFinal?.toFixed(2) ?? "—"}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EvaluacionesTable({ evaluaciones }: { evaluaciones: AdminEvaluacionItem[] }) {
  if (evaluaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <UsersIcon />
        <p className="text-sm font-medium mt-3">No hay evaluaciones publicadas</p>
      </div>
    );
  }

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50/50">
          <th className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Docente</th>
          <th className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Título</th>
          <th className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Materia</th>
          <th className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Comisión</th>
          <th className="text-left px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Publicación</th>
          <th className="text-center px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Estado</th>
          <th className="text-center px-4 py-3 font-bold text-slate-400 uppercase tracking-wider">Inscriptos</th>
        </tr>
      </thead>
      <tbody>
        {evaluaciones.map((ev, idx) => (
          <tr key={`${ev.legajoDocente}_${ev.tituloEvaluacion}_${idx}`} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            <td className="px-4 py-3">
              <p className="font-bold text-slate-800">{ev.nombreDocente}</p>
              <p className="text-[10px] text-slate-400">Leg. {ev.legajoDocente}</p>
            </td>
            <td className="px-4 py-3 text-slate-700 font-medium">{ev.tituloEvaluacion}</td>
            <td className="px-4 py-3 text-slate-500">{ev.nombreMateria}</td>
            <td className="px-4 py-3 text-slate-500">{ev.nombreDivision}</td>
            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatoFecha(ev.fechaPublicacion)}</td>
            <td className="px-4 py-3 text-center">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getEstadoBadge(ev.estado)}`}>
                {ev.estado.charAt(0).toUpperCase() + ev.estado.slice(1)}
              </span>
            </td>
            <td className="px-4 py-3 text-center">
              <span className="inline-flex items-center gap-1 text-slate-700 font-bold">
                <ClockIcon />
                {ev.alumnosInscriptos}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
