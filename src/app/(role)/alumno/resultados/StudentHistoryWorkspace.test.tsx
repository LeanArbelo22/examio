import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMisIntentos } from "@/hooks/useEvaluaciones";
import { useGetMaterias } from "@/hooks/useMaterias";
import { useGetComisiones } from "@/hooks/useComisiones";
import { StudentHistoryWorkspace } from "./StudentHistoryWorkspace";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("@/hooks/useEvaluaciones", () => ({
  useMisIntentos: vi.fn(),
}));

vi.mock("@/hooks/useMaterias", () => ({
  useGetMaterias: vi.fn(),
}));

vi.mock("@/hooks/useComisiones", () => ({
  useGetComisiones: vi.fn(),
}));

const routerReplace = vi.fn();

describe("StudentHistoryWorkspace", () => {
  beforeEach(() => {
    routerReplace.mockReset();
    vi.mocked(usePathname).mockReturnValue("/alumno/resultados");
    vi.mocked(useRouter).mockReturnValue({ replace: routerReplace } as never);
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as never);
    vi.mocked(useGetMaterias).mockReturnValue({ materias: [] } as never);
    vi.mocked(useGetComisiones).mockReturnValue({ comisiones: [] } as never);
    vi.mocked(useMisIntentos).mockReturnValue({
      data: {
        items: [
          {
            idIntento: 15,
            idActividad: 8,
            idPublicacion: 12,
            titulo: "Parcial SQL",
            tipo: "evaluacion",
            idMateria: 4,
            materia: "Bases de Datos",
            idMateriaDivision: 9,
            division: "2A",
            numeroIntento: 2,
            cantidadIntentosMaximos: 3,
            estado: "entregado",
            fechaInicio: "2026-10-01T10:00:00.000Z",
            fechaFin: "2026-10-01T11:00:00.000Z",
            notaAutomatica: 8,
            notaFinal: 8,
            escalaCalificacion: 10,
            notaAprobacion: 4,
            resultado: "aprobado",
            estadoCorreccion: "completa",
            correccionPendiente: false,
            correccionConfirmada: true,
            revisionDisponible: true,
            esIntentoValido: true,
            seleccionIntentoValido: "automatica",
          },
        ],
        resumen: {
          totalIntentos: 2,
          totalEvaluaciones: 1,
          evaluacionesAprobadas: 1,
          evaluacionesDesaprobadas: 0,
          evaluacionesPendientes: 0,
        },
        paginacion: { pagina: 1, limite: 10, total: 2, totalPaginas: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);
  });

  it("muestra el historial, la escala y el intento académico", () => {
    render(<StudentHistoryWorkspace />);

    expect(screen.getByText("Parcial SQL")).toBeInTheDocument();
    expect(screen.getByText("8.00 / 10")).toBeInTheDocument();
    expect(screen.getByText("Resultado académico")).toBeInTheDocument();
    expect(screen.getByText("2 intentos encontrados")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Revisar examen/ })).toBeVisible();
  });

  it("no presenta nota ni resultado académico para un intento anulado", () => {
    vi.mocked(useMisIntentos).mockReturnValue({
      data: {
        items: [
          {
            idIntento: 14,
            idActividad: 8,
            idPublicacion: 12,
            titulo: "Parcial SQL",
            tipo: "evaluacion",
            idMateria: 4,
            materia: "Bases de Datos",
            idMateriaDivision: 9,
            division: "2A",
            numeroIntento: 1,
            cantidadIntentosMaximos: 3,
            estado: "anulado",
            fechaInicio: "2026-10-01T09:00:00.000Z",
            fechaFin: "2026-10-01T09:30:00.000Z",
            notaAutomatica: null,
            notaFinal: 8,
            escalaCalificacion: 10,
            notaAprobacion: 4,
            resultado: "aprobado",
            estadoCorreccion: "completa",
            correccionPendiente: false,
            correccionConfirmada: true,
            revisionDisponible: true,
            esIntentoValido: false,
            seleccionIntentoValido: null,
          },
        ],
        resumen: {
          totalIntentos: 1,
          totalEvaluaciones: 0,
          evaluacionesAprobadas: 0,
          evaluacionesDesaprobadas: 0,
          evaluacionesPendientes: 0,
        },
        paginacion: { pagina: 1, limite: 10, total: 1, totalPaginas: 1 },
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    render(<StudentHistoryWorkspace />);

    const attemptCard = screen.getByRole("heading", { name: "Parcial SQL" }).closest("article");
    expect(attemptCard).not.toBeNull();
    const card = within(attemptCard!);
    expect(card.getByText("Anulado")).toBeVisible();
    expect(card.getByText("Este intento no forma parte de tu resultado académico.")).toBeVisible();
    expect(card.queryByText("Aprobado")).not.toBeInTheDocument();
    expect(card.queryByText("8.00 / 10")).not.toBeInTheDocument();
    expect(card.queryByText(/Aprobación:/)).not.toBeInTheDocument();
    expect(card.queryByRole("link", { name: /Revisar examen/ })).not.toBeInTheDocument();
  });

  it("valida el rango de fechas antes de actualizar la URL", async () => {
    const user = userEvent.setup();
    render(<StudentHistoryWorkspace />);

    await user.type(screen.getByLabelText("Fecha desde"), "2026-10-20");
    await user.type(screen.getByLabelText("Fecha hasta"), "2026-10-10");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(
      screen.getByText("La fecha desde no puede ser posterior a la fecha hasta."),
    ).toBeInTheDocument();
    expect(routerReplace).not.toHaveBeenCalled();
  });
});
