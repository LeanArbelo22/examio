import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "next-auth/react";
import {
  useGetEstadisticasAlumno,
  useGetExamenesPendientes,
  useGetHistorialCorregido,
} from "@/hooks/useEvaluaciones";
import AlumnoPage from "./page";

vi.mock("next-auth/react", () => ({ useSession: vi.fn() }));
vi.mock("@/hooks/useEvaluaciones", () => ({
  useGetEstadisticasAlumno: vi.fn(),
  useGetExamenesPendientes: vi.fn(),
  useGetHistorialCorregido: vi.fn(),
}));

describe("AlumnoPage", () => {
  beforeEach(() => {
    vi.mocked(useSession).mockReturnValue({
      data: { user: { identificadorInstitucional: "30500" } },
    } as never);
    vi.mocked(useGetExamenesPendientes).mockReturnValue({
      data: [],
      isLoading: false,
    } as never);
    vi.mocked(useGetEstadisticasAlumno).mockReturnValue({
      data: {
        totalCorregidos: 1,
        promedioGeneral: 7,
        aprobados: 1,
        porcentajeAprobacion: 100,
      },
    } as never);
    vi.mocked(useGetHistorialCorregido).mockReturnValue({
      data: [
        {
          idIntento: 21,
          tituloEvaluacion: "Parcial de redes",
          materia: "Redes",
          division: "1A",
          fechaFin: "2026-10-17T20:00:00.000Z",
          notaFinal: 7,
          numeroIntento: 1,
          correccionPendiente: false,
          correccionConfirmada: true,
          revisionDisponible: true,
        },
      ],
    } as never);
  });

  it("prioriza pendientes, resumen e historial sin listar exámenes entregados", () => {
    render(<AlumnoPage />);

    expect(screen.getByRole("heading", { name: "Próximas actividades" })).toBeVisible();
    expect(screen.getByText("Estás al día")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Resumen académico" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Resultados recientes" })).toBeVisible();
    expect(screen.getByText("Parcial de redes")).toBeVisible();
    expect(screen.queryByText("Exámenes entregados")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /historial/i }).length).toBeGreaterThan(0);
  });

  it("muestra el título y la acción principal de una actividad pendiente", () => {
    vi.mocked(useGetExamenesPendientes).mockReturnValue({
      data: [
        {
          idPublicacion: 31,
          titulo: "Segundo parcial",
          materia: "Redes",
          carrera: "Tecnicatura",
          docente: "Docente",
          fechaInicio: "2026-10-17T19:00:00.000Z",
          fechaFin: "2026-10-18T19:00:00.000Z",
          duracionMinutos: 90,
          recursosPermitidos: null,
          cantidadIntentosMaximos: 2,
          intentosRealizados: 1,
          estadoUltimoIntento: "anulado",
          enProgreso: false,
          puedeReintentar: true,
          intentosAgotados: false,
        },
      ],
      isLoading: false,
    } as never);

    render(<AlumnoPage />);

    expect(screen.getByRole("heading", { name: "Segundo parcial" })).toBeVisible();
    expect(screen.getByText("1 de 2")).toBeVisible();
    expect(screen.getByRole("link", { name: "Reintentar examen" })).toHaveAttribute(
      "href",
      "/alumno/examen/31",
    );
  });
});
