import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useConfirmarCorreccionIntento } from "@/hooks/useEvaluaciones";
import type { IntentoCompleto } from "@/types";
import { CorrectionConfirmation } from "./CorrectionConfirmation";

vi.mock("@/hooks/useEvaluaciones", () => ({
  useConfirmarCorreccionIntento: vi.fn(),
}));

const useConfirmationMock = vi.mocked(useConfirmarCorreccionIntento);
const mutateAsync = vi.fn();

const attempt: IntentoCompleto = {
  idIntento: 73,
  idAlumno: 30001,
  idPublicacion: 47,
  estado: "entregado",
  notaFinal: 8,
  notaAutomatica: 8,
  notaFinalCalculada: 8,
  notaFinalManual: null,
  correccionPendiente: true,
  correccionConfirmada: false,
  revisionDisponible: false,
  escalaCalificacion: 10,
  notaAprobacion: 4,
  fechaInicio: "2026-08-17T12:00:00.000Z",
  fechaFin: "2026-08-17T12:30:00.000Z",
  numeroIntento: 1,
  nombre: "Alumno",
  apellido: "E2E",
  correo: "alumno@cervantes.edu.ar",
  tituloEvaluacion: "Evaluación",
  tipoEvaluacion: "evaluacion",
  duracionMinutos: 30,
  preguntas: [],
};

describe("CorrectionConfirmation", () => {
  beforeEach(() => {
    mutateAsync.mockReset().mockResolvedValue({});
    useConfirmationMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
    } as unknown as ReturnType<typeof useConfirmarCorreccionIntento>);
  });

  it("confirma explícitamente una corrección completa", async () => {
    const user = userEvent.setup();
    render(<CorrectionConfirmation attempt={attempt} pendingCount={0} />);

    await user.click(screen.getByRole("button", { name: "Confirmar corrección" }));
    expect(screen.getByRole("dialog", { name: "Confirmar corrección" })).toBeVisible();
    await user.click(
      screen.getAllByRole("button", { name: "Confirmar corrección" })[1],
    );

    expect(mutateAsync).toHaveBeenCalledOnce();
  });

  it("permanece deshabilitada mientras hay preguntas pendientes", () => {
    render(<CorrectionConfirmation attempt={attempt} pendingCount={2} />);

    expect(screen.getByRole("button", { name: "Confirmar corrección" })).toBeDisabled();
    expect(screen.getByText(/quedan 2 preguntas pendientes/i)).toBeVisible();
  });

  it("muestra el estado final sin volver a confirmar", () => {
    render(
      <CorrectionConfirmation
        attempt={{
          ...attempt,
          correccionPendiente: false,
          correccionConfirmada: true,
          revisionDisponible: true,
        }}
        pendingCount={0}
      />,
    );

    expect(screen.getByText("Corrección confirmada")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Confirmar corrección" })).not.toBeInTheDocument();
  });
});
