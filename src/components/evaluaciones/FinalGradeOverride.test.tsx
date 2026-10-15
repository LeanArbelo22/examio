import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMutateCalificarIntento } from "@/hooks/useEvaluaciones";
import type { IntentoCompleto } from "@/types";
import { FinalGradeOverride } from "./FinalGradeOverride";

vi.mock("@/hooks/useEvaluaciones", () => ({
  useMutateCalificarIntento: vi.fn(),
}));

const useOverrideMock = vi.mocked(useMutateCalificarIntento);
const mutateAsync = vi.fn();

const attempt: IntentoCompleto = {
  idIntento: 73,
  idAlumno: 30001,
  idPublicacion: 47,
  estado: "entregado",
  notaFinal: 8.5,
  notaAutomatica: 2,
  notaFinalCalculada: 8.5,
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

describe("FinalGradeOverride", () => {
  beforeEach(() => {
    mutateAsync.mockReset().mockResolvedValue({});
    useOverrideMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useMutateCalificarIntento>);
  });

  it("confirma explícitamente antes de reemplazar la nota efectiva", async () => {
    const user = userEvent.setup();
    render(<FinalGradeOverride attempt={attempt} />);

    const input = screen.getByLabelText("Nota final");
    await user.clear(input);
    await user.type(input, "9");
    await user.click(screen.getByRole("button", { name: "Guardar nota final" }));

    expect(screen.getByRole("dialog", { name: "Confirmar nota final" })).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));

    expect(mutateAsync).toHaveBeenCalledWith({ idIntento: 73, notaFinal: 9 });
  });

  it("bloquea el override mientras existan preguntas pendientes", () => {
    render(
      <FinalGradeOverride
        attempt={{
          ...attempt,
          notaFinalCalculada: null,
          preguntas: [
            {
              idPregunta: 502,
              enunciado: "Pendiente",
              tipo: "abierta",
              grupoConceptualmente: "Grupo",
              puntajeMaximo: 2,
              puntajeObtenido: null,
              origenCorreccion: null,
              comentariosDocente: null,
              corregidoPor: null,
              fechaCorreccion: null,
              respuesta: null,
              opciones: [],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText(/Corregí todas las preguntas/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar nota final" })).toBeDisabled();
  });
});
