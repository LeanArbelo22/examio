import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useGetIntentosAlumnoPublicacion,
  useRestaurarSeleccionAutomaticaIntento,
  useSeleccionarIntentoValido,
} from "@/hooks/useEvaluaciones";
import type { AlumnoIntento, IntentoAlumnoPublicacion } from "@/types/index";
import { StudentAttemptsModal } from "./StudentAttemptsModal";

vi.mock("@/hooks/useEvaluaciones", () => ({
  useGetIntentosAlumnoPublicacion: vi.fn(),
  useRestaurarSeleccionAutomaticaIntento: vi.fn(),
  useSeleccionarIntentoValido: vi.fn(),
}));

const attemptsQueryMock = vi.mocked(useGetIntentosAlumnoPublicacion);
const selectHookMock = vi.mocked(useSeleccionarIntentoValido);
const restoreHookMock = vi.mocked(useRestaurarSeleccionAutomaticaIntento);
const selectMutate = vi.fn();
const restoreMutate = vi.fn();

const student: AlumnoIntento = {
  matricula: 30500,
  nombre: "Julieta",
  apellido: "Acosta",
  correo: "julieta@example.com",
  idIntento: 12,
  estadoIntento: "entregado",
  notaFinal: 8,
  notaAutomatica: 8,
  fechaInicioIntento: "2026-10-11T12:00:00.000Z",
  fechaFinIntento: "2026-10-11T13:00:00.000Z",
  numeroIntento: 2,
  cantidadIntentosMaximos: 3,
  intentosAgotados: false,
};

const attempts: IntentoAlumnoPublicacion[] = [
  {
    idIntento: 12,
    idPublicacion: 41,
    idAlumno: 30500,
    numeroIntento: 2,
    estado: "entregado",
    fechaInicio: "2026-10-11T12:00:00.000Z",
    fechaFin: "2026-10-11T13:00:00.000Z",
    notaAutomatica: 8,
    notaFinalCalculada: 8,
    notaFinalManual: null,
    notaFinal: 8,
    escalaCalificacion: 10,
    notaAprobacion: 4,
    estadoCorreccion: "completa",
    preguntasPendientesCorreccion: 0,
    esIntentoValido: true,
    seleccionIntentoValido: "manual",
  },
  {
    idIntento: 11,
    idPublicacion: 41,
    idAlumno: 30500,
    numeroIntento: 1,
    estado: "entregado",
    fechaInicio: "2026-10-10T12:00:00.000Z",
    fechaFin: "2026-10-10T13:00:00.000Z",
    notaAutomatica: 9,
    notaFinalCalculada: 9,
    notaFinalManual: null,
    notaFinal: 9,
    escalaCalificacion: 10,
    notaAprobacion: 4,
    estadoCorreccion: "completa",
    preguntasPendientesCorreccion: 0,
    esIntentoValido: false,
    seleccionIntentoValido: null,
  },
];

describe("StudentAttemptsModal", () => {
  beforeEach(() => {
    selectMutate.mockReset().mockResolvedValue({});
    restoreMutate.mockReset().mockResolvedValue({});
    attemptsQueryMock.mockReturnValue({
      data: attempts,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetIntentosAlumnoPublicacion>);
    selectHookMock.mockReturnValue({
      mutateAsync: selectMutate,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useSeleccionarIntentoValido>);
    restoreHookMock.mockReturnValue({
      mutateAsync: restoreMutate,
      isPending: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useRestaurarSeleccionAutomaticaIntento>);
  });

  it("confirma antes de cambiar el intento válido", async () => {
    const user = userEvent.setup();
    render(
      <StudentAttemptsModal
        idPublicacion={41}
        alumno={student}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Elegir como resultado" }));
    expect(selectMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirmar selección" }));
    expect(selectMutate).toHaveBeenCalledWith(11);
  });

  it("permite restaurar la regla automática con confirmación", async () => {
    const user = userEvent.setup();
    render(
      <StudentAttemptsModal
        idPublicacion={41}
        alumno={student}
        onClose={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Volver a selección automática" }),
    );
    expect(restoreMutate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(restoreMutate).toHaveBeenCalledOnce();
  });
});
