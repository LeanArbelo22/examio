"use client";

import { useState, useMemo, useEffect } from "react";
import { Carrera, CreateCarreraPayload, UpdateCarreraPayload } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Modal } from "@/components/ui/Modal";
import { DetalleCarreraModal } from "./DetalleCarreraModal";
import {
  useGetCarreras,
  usePostCarrera,
  useUpdateCarrera,
  useDeleteCarrera,
} from "@/hooks/useCarreras";

export default function CarrerasPage() {
  // HOOKS REALES DE LA API CON RE-FETCH AUTOMÁTICO
  const { carreras, isLoading, isError } = useGetCarreras();
  const { createCarrera, isCreating } = usePostCarrera();
  const { mutate: updateCarrera, isPending: isUpdating } = useUpdateCarrera();
  const { mutate: eliminarCarrera } = useDeleteCarrera();

  // ESTADOS DE CONTROL DE FLUJO
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCarrera, setSelectedCarrera] = useState<Carrera | null>(null);
  const [carreraEnEdicion, setCarreraEnEdicion] = useState<Carrera | null>(
    null,
  );

  // ESTADOS LOCALES PARA LOS INPUTS DEL FORMULARIO UNIFICADO
  const [formData, setFormData] = useState({
    Nombre: "",
    Descripcion: "",
    DuracionSemestres: "",
  });

  // ⚡ SEPARACIÓN DE REGISTROS EN UN SOLO PASO UTILIZANDO EL AJUSTE TOLERANTE DE BIT/BOOLEANOS
  const { carrerasActivas, carrerasInhabilitadas } = useMemo(() => {
    if (!carreras) return { carrerasActivas: [], carrerasInhabilitadas: [] };

    return carreras.reduce(
      (acc, carrera) => {
        const isActiva =
          carrera.estado === true || Number(carrera.estado) === 1;
        if (isActiva) {
          acc.carrerasActivas.push(carrera);
        } else {
          acc.carrerasInhabilitadas.push(carrera);
        }
        return acc;
      },
      {
        carrerasActivas: [] as Carrera[],
        carrerasInhabilitadas: [] as Carrera[],
      },
    );
  }, [carreras]);

  // Sincronizar datos del formulario cuando se pulsa "Editar"
  useEffect(() => {
    if (carreraEnEdicion) {
      setFormData({
        Nombre: carreraEnEdicion.nombre,
        Descripcion: carreraEnEdicion.descripcion || "",
        DuracionSemestres: String(carreraEnEdicion.duracionSemestres),
      });
    } else {
      setFormData({ Nombre: "", Descripcion: "", DuracionSemestres: "" });
    }
  }, [carreraEnEdicion]);

  const handleEditClick = (carrera: Carrera) => {
    setCarreraEnEdicion(carrera);
    // Hacemos un scroll suave hacia el formulario para mejorar la usabilidad en pantallas chicas
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (carrera: Carrera) => {
    if (
      window.confirm(
        `¿Estás seguro de que querés inhabilitar la carrera "${carrera.nombre}"?`,
      )
    ) {
      eliminarCarrera(carrera.id);
      if (carreraEnEdicion?.id === carrera.id) setCarreraEnEdicion(null);
    }
  };

  const handleViewPlan = (carrera: Carrera) => {
    setSelectedCarrera(carrera);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (carreraEnEdicion) {
      const data: UpdateCarreraPayload = {
        Nombre: formData.Nombre,
        Descripcion: formData.Descripcion,
        DuracionSemestres: Number(formData.DuracionSemestres),
      };
      updateCarrera(
        { id: carreraEnEdicion.id, data },
        { onSuccess: () => setCarreraEnEdicion(null) },
      );
    } else {
      const payload: CreateCarreraPayload = {
        Nombre: formData.Nombre,
        Descripcion: formData.Descripcion,
        DuracionSemestres: Number(formData.DuracionSemestres),
      };
      createCarrera(payload, {
        onSuccess: () =>
          setFormData({ Nombre: "", Descripcion: "", DuracionSemestres: "" }),
      });
    }
  };

  return (
    <div className="space-y-6 antialiased">
      {/* Cabecera */}
      <div className="border-b border-slate-200/60 pb-4">
        <h1 className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl">
          Estructuras de Cursado (ABM Carreras)
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Definí planes de estudio globales e inhabilitá planes obsoletos de la
          institución.
        </p>
      </div>

      {/* Grilla Asimétrica Unificada */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* COLUMNA LISTADO (75% en desktop) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Registros Activos
          </h2>

          {isLoading ? (
            <div className="text-sm font-medium text-slate-400 p-8 text-center bg-white border border-slate-200/60 rounded-2xl">
              Cargando registros desde la base de datos...
            </div>
          ) : isError ? (
            <ErrorMessage message="Error crítico: No se pudo establecer conexión con los servicios de carreras." />
          ) : carrerasActivas.length === 0 ? (
            <div className="text-sm font-medium text-slate-400 p-8 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
              No hay carreras activas en la institución actualmente.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-wider select-none">
                      <th className="p-4">Carrera</th>
                      <th className="p-4">Duración</th>
                      <th className="p-4 text-right">Acciones de Gestión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {carrerasActivas.map((carrera) => (
                      <tr
                        key={carrera.id}
                        className="hover:bg-slate-50/60 transition-colors group"
                      >
                        <td className="p-4 max-w-xs">
                          <p className="font-bold text-slate-800 tracking-tight">
                            {carrera.nombre}
                          </p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {carrera.descripcion ||
                              "Sin descripción corta registrada."}
                          </p>
                        </td>
                        <td className="p-4 font-mono font-bold text-slate-600 text-xs">
                          {carrera.duracionSemestres} semestres
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end opacity-80 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleViewPlan(carrera)}
                              className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              📚 Plan y Alumnos
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditClick(carrera)}
                              className="text-xs font-bold text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteClick(carrera)}
                              className="text-xs font-bold text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors"
                            >
                              Inhabilitar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* NUEVO BLOQUE B: Carreras Inhabilitadas (Historial / Archivo) */}
          {/* ======================================================== */}
          {!isLoading && !isError && carrerasInhabilitadas.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-slate-200/60">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Archivo de Planes Inhabilitados
                </h2>
                <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-1.5 py-0.5 rounded-md">
                  {carrerasInhabilitadas.length}
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200/60 rounded-2xl overflow-hidden opacity-75 hover:opacity-90 transition-opacity duration-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-400 font-bold text-[10px] uppercase tracking-wider select-none">
                        <th className="p-4">Carrera Archivada</th>
                        <th className="p-4">Duración</th>
                        <th className="p-4 text-right">Estado Técnico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/60 text-slate-500">
                      {carrerasInhabilitadas.map((carrera) => (
                        <tr
                          key={carrera.id}
                          className="hover:bg-slate-100/50 transition-colors"
                        >
                          <td className="p-4">
                            <p className="font-bold text-slate-600 tracking-tight line-through decoration-slate-300">
                              {carrera.nombre}
                            </p>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {carrera.descripcion ||
                                "Sin observaciones en archivo."}
                            </p>
                          </td>
                          <td className="p-4 font-mono font-medium text-slate-400">
                            {carrera.duracionSemestres} semestres
                          </td>
                          <td className="p-4 text-right">
                            {/* Un indicativo visual tenue en lugar de botones de edición activos */}
                            <span className="inline-block text-[9px] font-extrabold uppercase tracking-wide text-slate-400 bg-slate-200/60 border border-slate-300/40 px-2 py-0.5 rounded-md select-none">
                              Inactivo (Baja Lógica)
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA FORMULARIO VIVO (25% en desktop) */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {carreraEnEdicion ? "Editor de Registro" : "Nuevo Registro"}
            </h2>
            {carreraEnEdicion && (
              <button
                type="button"
                onClick={() => setCarreraEnEdicion(null)}
                className="text-[10px] font-bold text-indigo-600 hover:underline"
              >
                Limpiar / Crear nuevo
              </button>
            )}
          </div>

          <form
            onSubmit={handleFormSubmit}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-[0_2px_8px_rgba(0,0,0,0.01)] space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Nombre de la Carrera
              </label>
              <input
                type="text"
                value={formData.Nombre}
                onChange={(e) =>
                  setFormData({ ...formData, Nombre: e.target.value })
                }
                placeholder="Ej: Analista de Sistemas"
                className="block w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-800"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Descripción
              </label>
              <textarea
                rows={3}
                value={formData.Descripcion}
                onChange={(e) =>
                  setFormData({ ...formData, Descripcion: e.target.value })
                }
                placeholder="Detalle de la resolución o plan ministerial..."
                className="block w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-medium text-slate-800 resize-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Duración (Semestres)
              </label>
              <input
                type="number"
                min="1"
                value={formData.DuracionSemestres}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    DuracionSemestres: e.target.value,
                  })
                }
                placeholder="Ej: 6"
                className="block w-full px-3 py-2 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-mono font-bold text-slate-800"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isCreating || isUpdating}
              className="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl hover:bg-indigo-700 active:scale-[0.99] transition-all shadow-sm"
            >
              {isCreating || isUpdating
                ? "Procesando en API..."
                : carreraEnEdicion
                  ? "Actualizar Registro"
                  : "Guardar Carrera"}
            </Button>
          </form>
        </div>
      </div>

      {/* MODAL GLOBAL MIGRADO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCarrera(null);
        }}
        title={`Plan de Cursado — ${selectedCarrera?.nombre || "..."}`}
      >
        {selectedCarrera && (
          <DetalleCarreraModal carreraId={selectedCarrera.id} />
        )}
      </Modal>
    </div>
  );
}
