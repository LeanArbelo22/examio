"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGetAdminAnalitica } from "@/hooks/useAdmin";
import { AdminFilters } from "@/components/admin/AdminFilters";
import { AdminKpis } from "@/components/admin/AdminKpis";
import { AdminTabs } from "@/components/admin/AdminTabs";

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </svg>
  );
}

function SkeletonCard() {
  return <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />;
}

function SkeletonRow() {
  return <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />;
}

export default function AdminAnaliticaPage() {
  const router = useRouter();
  const [filtros, setFiltros] = useState<Record<string, string>>({
    idCarrera: "",
    idMateria: "",
    idMateriaDivision: "",
    legajoDocente: "",
    matriculaAlumno: "",
  });

  const { data, isLoading, isError, error } = useGetAdminAnalitica(filtros);

  return (
    <div className="space-y-6 antialiased">

      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/admin")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-wider"
        >
          <ArrowLeftIcon />
          Volver al panel
        </button>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <BarChartIcon />
          Dashboard Analítico
        </div>
      </div>

      <AdminFilters filtros={filtros} setFiltros={setFiltros} />

      {isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        </div>
      )}

      {isError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center">
          <p className="text-sm font-bold text-red-600 mb-1">Error al cargar los datos</p>
          <p className="text-xs text-red-400">{(error as Error)?.message ?? "Intente nuevamente más tarde."}</p>
        </div>
      )}

      {data && (
        <>
          <AdminKpis kpis={data.kpis} />
          <AdminTabs intentos={data.intentos} evaluaciones={data.evaluaciones} />
        </>
      )}
    </div>
  );
}
