import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSession } from "next-auth/react";
import { useGetEvaluacionesDocente } from "@/hooks/useEvaluaciones";
import type { EvaluacionDocente } from "@/types";
import { TeacherEvaluationsExplorer } from "./TeacherEvaluationsExplorer";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/hooks/useEvaluaciones", () => ({
  useGetEvaluacionesDocente: vi.fn(),
}));

const useSessionMock = vi.mocked(useSession);
const useEvaluationsMock = vi.mocked(useGetEvaluacionesDocente);

const evaluations: EvaluacionDocente[] = [
  {
    idPublicacion: 31,
    idActividad: 25,
    idMateria: 8,
    idMateriaDivision: 17,
    titulo: "Primer parcial",
    tipo: "evaluacion",
    materia: "Fundamentos de Redes",
    carrera: "Tecnicatura en Redes",
    division: "1° A",
    fechaInicio: "2026-10-20T12:00:00.000Z",
    fechaFin: "2026-10-20T13:30:00.000Z",
    duracionMinutos: 90,
    cantidadIntentosMaximos: 2,
    recursosPermitidos: null,
    estado: "publicada",
    alumnosInscriptos: 28,
    totalIntentos: 19,
  },
  {
    idPublicacion: 32,
    idActividad: 26,
    idMateria: 8,
    idMateriaDivision: 18,
    titulo: "Segundo parcial",
    tipo: "evaluacion",
    materia: "Fundamentos de Redes",
    carrera: "Tecnicatura en Redes",
    division: "1° B",
    fechaInicio: "2026-11-20T12:00:00.000Z",
    fechaFin: "2026-11-20T13:30:00.000Z",
    duracionMinutos: 90,
    cantidadIntentosMaximos: 1,
    recursosPermitidos: null,
    estado: "publicada",
    alumnosInscriptos: 24,
    totalIntentos: 10,
  },
  {
    idPublicacion: 40,
    idActividad: 30,
    idMateria: 9,
    idMateriaDivision: 22,
    titulo: "Trabajo práctico",
    tipo: "tp",
    materia: "Programación",
    carrera: "Analista de Sistemas",
    division: "2° A",
    fechaInicio: "2026-09-10T12:00:00.000Z",
    fechaFin: "2026-09-10T13:30:00.000Z",
    duracionMinutos: 60,
    cantidadIntentosMaximos: 1,
    recursosPermitidos: null,
    estado: "publicada",
    alumnosInscriptos: 20,
    totalIntentos: 18,
  },
];

describe("TeacherEvaluationsExplorer", () => {
  beforeEach(() => {
    useSessionMock.mockReturnValue({
      data: {
        user: {
          id: "100",
          name: "Gabriel",
          email: "gabriel@example.com",
          rol: "docente",
          identificadorInstitucional: "100",
        },
        expires: "2099-01-01",
      },
      status: "authenticated",
      update: vi.fn(),
    });
    useEvaluationsMock.mockReturnValue({
      data: evaluations,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetEvaluacionesDocente>);
  });

  it("agrupa el inicio docente por materia", () => {
    render(<TeacherEvaluationsExplorer />);

    expect(screen.getByRole("heading", { name: "Mis materias" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Fundamentos de Redes" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Programación" })).toBeVisible();
    expect(screen.getByText("2 materias")).toBeVisible();
    expect(screen.queryByText("Primer parcial")).not.toBeInTheDocument();
  });

  it("muestra comisiones antes que actividades cuando una materia tiene varias", () => {
    render(<TeacherEvaluationsExplorer />);

    const materiaCard = screen
      .getByRole("heading", { name: "Fundamentos de Redes" })
      .closest("article");
    fireEvent.click(within(materiaCard!).getByRole("button", { name: "Ver materia" }));

    expect(screen.getByRole("heading", { name: "1° A" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "1° B" })).toBeVisible();
    expect(screen.getByText("2 comisiones")).toBeVisible();
    expect(screen.queryByText("Primer parcial")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Volver a materias/ })).toBeVisible();
  });

  it("evita el paso de comisión cuando la materia tiene una sola", () => {
    render(<TeacherEvaluationsExplorer />);

    const materiaCard = screen
      .getByRole("heading", { name: "Programación" })
      .closest("article");
    fireEvent.click(within(materiaCard!).getByRole("button", { name: "Ver materia" }));

    expect(screen.getByRole("heading", { name: "Trabajo práctico" })).toBeVisible();
    expect(screen.getByText(/Comisión 2° A/)).toBeVisible();
    expect(screen.getByRole("button", { name: /Volver a materias/ })).toBeVisible();
  });

  it("filtra las actividades por la comisión seleccionada", () => {
    render(<TeacherEvaluationsExplorer />);

    const materiaCard = screen
      .getByRole("heading", { name: "Fundamentos de Redes" })
      .closest("article");
    fireEvent.click(within(materiaCard!).getByRole("button", { name: "Ver materia" }));

    const commissionCard = screen.getByRole("heading", { name: "1° B" }).closest("article");
    fireEvent.click(
      within(commissionCard!).getByRole("button", { name: "Ver actividades" }),
    );

    expect(screen.getByRole("heading", { name: "Segundo parcial" })).toBeVisible();
    expect(screen.queryByText("Primer parcial")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Volver a comisiones/ })).toBeVisible();
  });

  it("mantiene la barra de gestión visible en todos los niveles", () => {
    render(<TeacherEvaluationsExplorer />);

    const materiaCard = screen
      .getByRole("heading", { name: "Fundamentos de Redes" })
      .closest("article");
    fireEvent.click(within(materiaCard!).getByRole("button", { name: "Ver materia" }));

    expect(screen.getByRole("heading", { name: "Centro de Gestión Docente" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Crear actividad" })).toBeVisible();
  });
});
