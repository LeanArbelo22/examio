"use client";

import { useState, useMemo } from "react";
import { Alumno, CreateAlumnoPayload, UpdateAlumnoPayload } from "@/types/index";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { ManagementFilterPanel } from "@/components/admin/ManagementFilterPanel";
import { ManagementPageHeader } from "@/components/admin/ManagementPageHeader";
import { ManagementSectionHeader } from "@/components/admin/ManagementSectionHeader";
import {
  useGetAlumnos,
  useCreateAlumno,
  useUpdateAlumno,
  useDeleteAlumno,
} from "@/hooks/useAlumnos";
import { DetalleAlumnoModal } from "./DetalleAlumnoModal";

export default function AlumnosPage() {
  const { alumnos, isLoading, isError } = useGetAlumnos();
  const { mutate: createAlumno, isPending: isCreating } = useCreateAlumno();
  const { mutate: updateAlumno, isPending: isUpdating } = useUpdateAlumno();
  const { mutate: eliminarAlumno } = useDeleteAlumno();

  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [alumnoEnEdicion, setAlumnoEnEdicion] = useState<Alumno | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterEstado, setFilterEstado] = useState("activo");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  const [formData, setFormData] = useState({
    Nombre: "",
    Apellido: "",
    Correo: "",
    Cuil: "",
    Matricula: "",
  });

  const isProcessing = isCreating || isUpdating;

  const clearForm = () => {
    setAlumnoEnEdicion(null);
    setFormData({
      Nombre: "",
      Apellido: "",
      Correo: "",
      Cuil: "",
      Matricula: "",
    });
  };

  const handleEditClick = (alumno: Alumno) => {
    setAlumnoEnEdicion(alumno);
    setFormData({
      Nombre: alumno.nombre || "",
      Apellido: alumno.apellido || "",
      Correo: alumno.correo || "",
      Cuil: alumno.cuil || "",
      Matricula: String(alumno.matricula || ""),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (alumno: Alumno) => {
    if (
      window.confirm(
        `¿Estás seguro de inhabilitar al alumno "${alumno.nombre} ${alumno.apellido}"? (Se ejecutará baja lógica en SQL)`,
      )
    ) {
      eliminarAlumno(alumno.matricula);
    }
  };

  const handleOpenHistory = (alumno: Alumno) => {
    setSelectedAlumno(alumno);
    setIsModalOpen(true);
  };

  const alumnosFiltrados = useMemo(() => {
    if (!alumnos) return [];
    return alumnos.filter((al) => {
      const fullText =
        `${al.nombre || ""} ${al.apellido || ""} ${al.matricula || ""}`.toLowerCase();
      const matchesSearch = fullText.includes(searchQuery.toLowerCase());
      const matchesEstado =
        filterEstado === "todos" || al.estado === filterEstado;
      return matchesSearch && matchesEstado;
    });
  }, [alumnos, searchQuery, filterEstado]);

  const totalPages = Math.ceil(alumnosFiltrados.length / ITEMS_PER_PAGE) || 1;
  const alumnosPaginados = alumnosFiltrados.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (alumnoEnEdicion) {
      const payload: UpdateAlumnoPayload = {
        Nombre: formData.Nombre,
        Apellido: formData.Apellido,
        Correo: formData.Correo,
      };
      updateAlumno(
        { matricula: alumnoEnEdicion.matricula, data: payload },
        { onSuccess: clearForm },
      );
    } else {
      const payload: CreateAlumnoPayload = {
        Matricula: Number(formData.Matricula),
        Nombre: formData.Nombre,
        Apellido: formData.Apellido,
        Cuil: formData.Cuil,
        Correo: formData.Correo,
      };
      createAlumno(payload, {
        onSuccess: () =>
          setFormData({
            Nombre: "",
            Apellido: "",
            Correo: "",
            Cuil: "",
            Matricula: "",
          }),
      });
    }
  };

  return (
    <div className="space-y-6 antialiased">
      <ManagementPageHeader
        title="Legajos Estudiantiles (ABM Alumnos)"
        description="Control centralizado de matrículas, altas de CUIL e inscripciones operativas."
      />

      <ManagementFilterPanel columnCount={2}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, apellido o matrícula..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-600 font-medium text-slate-700"
        />
        <select
          value={filterEstado}
          onChange={(e) => {
            setFilterEstado(e.target.value);
            setCurrentPage(1);
          }}
          className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none font-medium text-slate-500"
        >
          <option value="activo">Estado: Activos</option>
          <option value="inactivo">Estado: Inactivos</option>
          <option value="suspendido">Estado: Suspendidos</option>
          <option value="todos">Mostrar Todos</option>
        </select>
      </ManagementFilterPanel>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <ManagementSectionHeader
            title="Nómina Homologada"
            summary={`Coincidencias: ${alumnosFiltrados.length}`}
          />

          {isError ? (
            <ErrorMessage message="Error al conectar con el microservicio transaccional de alumnos." />
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200/80 shadow-sm">
                <table className="w-full min-w-[720px] text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold text-[11px] uppercase tracking-wider select-none">
                      <th className="p-4">Estudiante</th>
                      <th className="p-4">CUIL / Correo</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-8 text-center text-slate-400"
                        >
                          Leyendo tablas de SQL Server...
                        </td>
                      </tr>
                    ) : alumnosPaginados.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-8 text-center text-slate-400 italic"
                        >
                          No se encontraron legajos con los criterios
                          ingresados.
                        </td>
                      </tr>
                    ) : (
                      alumnosPaginados.map((al) => (
                        <tr
                          key={al.matricula}
                          className={`hover:bg-slate-50/50 transition-colors ${al.estado === "inactivo" ? "opacity-50 bg-slate-50/40" : ""}`}
                        >
                          <td className="p-4">
                            <p className="font-bold text-slate-800 tracking-tight">
                              {al.nombre} {al.apellido}
                            </p>
                            <p className="text-[11px] font-mono text-indigo-600 font-bold mt-0.5">
                              Matrícula: {al.matricula}
                            </p>
                          </td>
                          <td className="p-4 max-w-[180px]">
                            <p className="text-xs font-semibold text-slate-600 truncate">
                              {al.correo}
                            </p>
                            <p className="text-[10px] font-mono font-medium text-slate-400 mt-0.5">
                              CUIL: {al.cuil || "No parametrizado"}
                            </p>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => handleOpenHistory(al)}
                                className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors"
                              >
                                📖 Inscripciones
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditClick(al)}
                                className="text-xs font-bold text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                              >
                                Editar
                              </button>
                              {al.estado !== "inactivo" && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClick(al)}
                                  className="text-xs font-bold text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                >
                                  Dar Baja
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                page={currentPage}
                totalPages={totalPages}
                total={alumnosFiltrados.length}
                itemLabel="alumnos"
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {alumnoEnEdicion ? "Modificar Datos" : "Registrar Alumno"}
          </h2>
          <form
            onSubmit={handleFormSubmit}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4"
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Nombre
                </label>
                <input
                  placeholder="Ej: Leandro"
                  value={formData.Nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, Nombre: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-medium text-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Apellido
                </label>
                <input
                  placeholder="Ej: Arbelo"
                  value={formData.Apellido}
                  onChange={(e) =>
                    setFormData({ ...formData, Apellido: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-medium text-slate-800"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                placeholder="alumno@cervantes.edu.ar"
                value={formData.Correo}
                onChange={(e) =>
                  setFormData({ ...formData, Correo: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-medium text-slate-800"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                CUIL (Fijo)
              </label>
              <input
                type="text"
                placeholder="Ej: 20-39401292-9"
                value={formData.Cuil}
                onChange={(e) =>
                  setFormData({ ...formData, Cuil: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-mono font-medium text-slate-800 disabled:opacity-40"
                required
                disabled={!!alumnoEnEdicion}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Número de Matrícula
              </label>
              <input
                type="number"
                placeholder="Ej: 45201"
                value={formData.Matricula}
                onChange={(e) =>
                  setFormData({ ...formData, Matricula: e.target.value })
                }
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-600 transition-all font-mono font-bold text-slate-800 disabled:opacity-40"
                required
                disabled={!!alumnoEnEdicion}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-indigo-600 text-white font-bold py-2.5 shadow-sm"
              disabled={isProcessing}
            >
              {isProcessing
                ? "Escribiendo en SQL..."
                : alumnoEnEdicion
                  ? "Actualizar Registro"
                  : "Confirmar Alta"}
            </Button>
            {alumnoEnEdicion && (
              <button
                type="button"
                onClick={clearForm}
                className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 mt-1.5 transition-colors"
              >
                Volver a nuevo registro
              </button>
            )}
          </form>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAlumno(null);
        }}
        title={`Inscripciones — Legajo: ${selectedAlumno?.matricula || ""}`}
      >
        {selectedAlumno && (
          <DetalleAlumnoModal matricula={selectedAlumno.matricula} />
        )}
      </Modal>
    </div>
  );
}
