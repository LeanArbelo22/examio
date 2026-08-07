"use client";

import { useState, useMemo } from "react";
import { Materia, CreateMateriaPayload, UpdateMateriaPayload } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingState } from "@/components/ui/LoadingState";
import { Pagination } from "@/components/ui/Pagination";
import { ManagementFilterPanel } from "@/components/admin/ManagementFilterPanel";
import { ManagementPageHeader } from "@/components/admin/ManagementPageHeader";
import { ManagementSectionHeader } from "@/components/admin/ManagementSectionHeader";
import { FormFieldError } from "@/components/forms/FormFieldError";
import {
  materiaFormSchema,
  type MateriaFormInput,
} from "@/lib/schemas/materiaSchema";
import { validationErrorsFromZod } from "@/lib/form-validation";
import { useGetCarreras } from "@/hooks/useCarreras";
import { useGetMaterias, useCreateMateria, useUpdateMateria, useDeleteMateria } from "@/hooks/useMaterias";
import { DetalleMateriaModal } from "./DetalleMateriaModal";

export default function MateriasPage() {
  const { materias, isLoading: isLoadingMaterias, isError: isErrorMaterias } = useGetMaterias();
  const { carreras, isLoading: isLoadingCarreras, isError: isErrorCarreras } = useGetCarreras();
  const { createMateria, isCreating } = useCreateMateria();
  const { mutate: updateMateria, isPending: isUpdating } = useUpdateMateria();
  const { mutate: eliminarMateria } = useDeleteMateria();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMateria, setSelectedMateria] = useState<Materia | null>(null);
  const [materiaEnEdicion, setMateriaEnEdicion] = useState<Materia | null>(null);

  const [formData, setFormData] = useState<MateriaFormInput>({ Nombre: "", Semestre: "", IdCarrera: "" });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // FILTROS
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCarrera, setFilterCarrera] = useState("");
  const [filterSemestre, setFilterSemestre] = useState("");

  // ==========================================
  // ESTADOS Y CONSTANTES DE PAGINACIÓN
  // ==========================================
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  const isLoading = isLoadingMaterias || isLoadingCarreras;
  const isError = isErrorMaterias || isErrorCarreras;

  const carrerasMap = useMemo(() => {
    if (!carreras) return {};
    return carreras.reduce((map, carrera) => {
      map[carrera.id] = carrera.nombre;
      return map;
    }, {} as Record<number, string>);
  }, [carreras]);

  // 1. Primero filtramos y ordenamos la totalidad de los datos
  const totalMateriasFiltradas = useMemo(() => {
    if (isLoading || !materias || !carreras) return [];

    const activas = materias.filter((m) => m.estado === true);

    const filtradas = activas.filter((materia) => {
      const matchesSearch = materia.nombre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCarrera = filterCarrera === "" || String(materia.idCarrera) === filterCarrera;
      const matchesSemestre = filterSemestre === "" || String(materia.semestre) === filterSemestre;

      return matchesSearch && matchesCarrera && matchesSemestre;
    });

    return filtradas.map((m) => ({
      ...m,
      nombreCarrera: carrerasMap[m.idCarrera] || "Plan Desconocido",
    })).sort((a, b) => (a.idCarrera - b.idCarrera) || (a.semestre - b.semestre));
  }, [materias, carreras, carrerasMap, isLoading, searchQuery, filterCarrera, filterSemestre]);

  // 2. Calculamos el total de páginas basado en el resultado filtrado
  const totalPages = useMemo(() => {
    return Math.ceil(totalMateriasFiltradas.length / ITEMS_PER_PAGE) || 1;
  }, [totalMateriasFiltradas]);

  // 3. Rebanamos el array para mostrar SOLO los 30 de la página actual
  const materiasPaginadas = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return totalMateriasFiltradas.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [totalMateriasFiltradas, currentPage]);

  const opcionesCarreras = useMemo(() => {
    if (!carreras) return [];
    return carreras.filter((c) => c.estado);
  }, [carreras]);

  const clearForm = () => {
    setMateriaEnEdicion(null);
    setFormData({ Nombre: "", Semestre: "", IdCarrera: "" });
    setFormErrors({});
  };

  const handleEditClick = (materia: Materia) => {
    setMateriaEnEdicion(materia);
    setFormData({
      Nombre: materia.nombre,
      Semestre: String(materia.semestre),
      IdCarrera: String(materia.idCarrera),
    });
    setFormErrors({});
  };

  const validateFormField = (field: keyof MateriaFormInput) => {
    const result = materiaFormSchema.safeParse(formData);
    const errors = result.success ? {} : validationErrorsFromZod(result.error.issues);
    setFormErrors((current) => {
      const next = { ...current };
      if (errors[field]) next[field] = errors[field];
      else delete next[field];
      return next;
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = materiaFormSchema.safeParse(formData);
    if (!validation.success) {
      setFormErrors(validationErrorsFromZod(validation.error.issues));
      return;
    }

    if (materiaEnEdicion) {
      const data: UpdateMateriaPayload = { Nombre: validation.data.Nombre, Semestre: validation.data.Semestre };
      updateMateria(
        { id: materiaEnEdicion.id, data },
        { onSuccess: clearForm },
      );
    } else {
      const payload: CreateMateriaPayload = validation.data;
      createMateria(payload, { onSuccess: () => setFormData({ Nombre: "", Semestre: "", IdCarrera: "" }) });
    }
  };

  return (
    <div className="space-y-6 antialiased">
      <ManagementPageHeader
        title="Asignaturas Académicas (ABM Materias)"
        description="Gestioná el mapa de cátedras institucionales y asignación semestral."
      />

      {/* PANEL DE FILTROS */}
      <ManagementFilterPanel columnCount={3}>
        <input
          type="text"
          placeholder="🔍 Buscar materia..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-700"
        />
        <select
          value={filterCarrera}
          onChange={(e) => {
            setFilterCarrera(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-500"
        >
          <option value="">Filtrar por Carrera (Todas)</option>
          {opcionesCarreras.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
        <select
          value={filterSemestre}
          onChange={(e) => {
            setFilterSemestre(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-500"
        >
          <option value="">Filtrar por Semestre (Todos)</option>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
            <option key={s} value={s}>Semestre {s}</option>
          ))}
        </select>
      </ManagementFilterPanel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* TABLA PRINCIPAL */}
        <div className="lg:col-span-2 space-y-4">
          <ManagementSectionHeader
            title="Planificación Activa"
            summary={`Total filtradas: ${totalMateriasFiltradas.length}`}
          />

          {isLoading ? (
            <LoadingState message="Sincronizando asignaturas..." />
          ) : isError ? (
            <ErrorMessage message="Error crítico al mapear las asignaturas." />
          ) : materiasPaginadas.length === 0 ? (
            <EmptyState title="Ninguna materia coincide con la búsqueda." />
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-wider select-none">
                        <th className="p-4">Materia / Cátedra</th>
                        <th className="p-4">Carrera Asociada</th>
                        <th className="p-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {materiasPaginadas.map((materia) => (
                        <tr key={materia.id} className="hover:bg-slate-50/60 transition-colors group">
                          <td className="p-4">
                            <p className="font-bold text-slate-800 tracking-tight">{materia.nombre}</p>
                            <p className="text-[11px] font-mono font-bold text-indigo-500 mt-0.5">Semestre {materia.semestre}</p>
                          </td>
                          <td className="p-4 text-xs font-semibold text-slate-500 max-w-[200px] truncate">{materia.nombreCarrera}</td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={() => { setSelectedMateria(materia); setIsModalOpen(true); }} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors">🗓️ Comisiones y Alumnos</button>
                              <button type="button" onClick={() => handleEditClick(materia)} className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200">Editar</button>
                              <button type="button" onClick={() => { if (window.confirm(`¿Inhabilitar?`)) eliminarMateria(materia.id); }} className="text-xs font-bold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">Inhabilitar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CONTROLES DE PAGINACIÓN */}
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                total={totalMateriasFiltradas.length}
                itemLabel="materias"
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        {/* FORMULARIO */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{materiaEnEdicion ? "Editor" : "Nuevo"}</h2>
          <form onSubmit={handleFormSubmit} className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4">
            <div>
              <label htmlFor="materia-nombre" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Nombre de la Materia</label>
              <input id="materia-nombre" type="text" maxLength={100} value={formData.Nombre} onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })} onBlur={() => validateFormField("Nombre")} aria-invalid={Boolean(formErrors.Nombre)} aria-describedby={formErrors.Nombre ? "materia-nombre-error" : undefined} placeholder="Ej: Matemáticas II" className="block w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-800" />
              <FormFieldError id="materia-nombre-error" message={formErrors.Nombre} />
            </div>
            <div>
              <label htmlFor="materia-semestre" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Número de Semestre</label>
              <input id="materia-semestre" type="number" min="1" value={formData.Semestre} onChange={(e) => setFormData({ ...formData, Semestre: e.target.value })} onBlur={() => validateFormField("Semestre")} aria-invalid={Boolean(formErrors.Semestre)} aria-describedby={formErrors.Semestre ? "materia-semestre-error" : undefined} placeholder="Ej: 2" className="block w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-mono font-bold text-slate-800" />
              <FormFieldError id="materia-semestre-error" message={formErrors.Semestre} />
            </div>
            <div>
              <label htmlFor="materia-carrera" className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Carrera Universitaria</label>
              <select id="materia-carrera" value={formData.IdCarrera} onChange={(e) => setFormData({ ...formData, IdCarrera: e.target.value })} onBlur={() => validateFormField("IdCarrera")} aria-invalid={Boolean(formErrors.IdCarrera)} aria-describedby={formErrors.IdCarrera ? "materia-carrera-error" : undefined} disabled={!!materiaEnEdicion} className="block w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-600 disabled:opacity-50">
                <option value="" disabled>Seleccioná la carrera...</option>
                {opcionesCarreras.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              <FormFieldError id="materia-carrera-error" message={formErrors.IdCarrera} />
            </div>
            <Button type="submit" disabled={isCreating || isUpdating} className="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl hover:bg-indigo-700 transition-all shadow-sm">
              {isCreating || isUpdating ? "Escribiendo en SQL..." : "Guardar Asignatura"}
            </Button>
          </form>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setSelectedMateria(null); }} title={`Detalle Operativo — ${selectedMateria?.nombre || "..."}`}>
        {selectedMateria && <DetalleMateriaModal materiaId={selectedMateria.id} />}
      </Modal>
    </div>
  );
}
