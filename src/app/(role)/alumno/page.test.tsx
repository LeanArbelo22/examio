import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "@/lib/api";
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
      isSuccess: true,
    } as never);
    vi.mocked(useGetEstadisticasAlumno).mockReturnValue({
      isSuccess: true,
      data: {
        totalCorregidos: 1,
        promedioGeneral: 7,
        aprobados: 1,
        porcentajeAprobacion: 100,
      },
    } as never);
    vi.mocked(useGetHistorialCorregido).mockReturnValue({
      isSuccess: true,
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
      isSuccess: true,
    } as never);

    render(<AlumnoPage />);

    expect(screen.getByRole("heading", { name: "Segundo parcial" })).toBeVisible();
    expect(screen.getByText("1 de 2")).toBeVisible();
    expect(screen.getByRole("link", { name: "Reintentar examen" })).toHaveAttribute(
      "href",
      "/alumno/examen/31",
    );
  });

  it("no informa que está al día ante un error y permite reintentar sin ocultar resultados", async () => {
    const refetch = vi.fn();
    vi.mocked(useGetExamenesPendientes).mockReturnValue({
      isError: true, isSuccess: false, isPending: false,
      error: new ApiError("Falla", 503), refetch,
    } as never);
    const view = render(<AlumnoPage />);
    expect(screen.queryByText("Estás al día")).not.toBeInTheDocument();
    expect(screen.queryByText("0 pendientes")).not.toBeInTheDocument();
    expect(screen.getByText("Parcial de redes")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(refetch).toHaveBeenCalledOnce();
    vi.mocked(useGetExamenesPendientes).mockReturnValue({ data: [], isSuccess: true } as never);
    view.rerender(<AlumnoPage />);
    expect(screen.getByText("Estás al día")).toBeVisible();
  });

  it("espera la respuesta de cada sección antes de mostrar estados vacíos", () => {
    vi.mocked(useGetExamenesPendientes).mockReturnValue({ isPending: true } as never);
    vi.mocked(useGetEstadisticasAlumno).mockReturnValue({ isPending: true } as never);
    vi.mocked(useGetHistorialCorregido).mockReturnValue({ isPending: true } as never);
    render(<AlumnoPage />);
    expect(screen.getAllByRole("status")).toHaveLength(3);
    expect(screen.queryByText("Estás al día")).not.toBeInTheDocument();
    expect(screen.queryByText("Todavía no hay resultados")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("aísla las fallas del resumen y del historial sin presentarlas como ausencia de resultados", () => {
    const failure = { isError: true, error: new ApiError("Falla", 503), refetch: vi.fn() };
    vi.mocked(useGetEstadisticasAlumno).mockReturnValue(failure as never);
    vi.mocked(useGetHistorialCorregido).mockReturnValue(failure as never);
    render(<AlumnoPage />);
    expect(screen.getByText("Estás al día")).toBeVisible();
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.queryByText("Todavía no hay resultados")).not.toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("no anuncia un promedio cero cuando aún no hay calificaciones", () => {
    vi.mocked(useGetEstadisticasAlumno).mockReturnValue({ isSuccess: true, data: { promedioGeneral: null } } as never);
    render(<AlumnoPage />);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });
});
