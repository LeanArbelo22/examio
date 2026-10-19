import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useActualizarPoliticaSupervision, usePoliticaSupervision } from "@/hooks/useSupervision";
import { SupervisionPolicyPanel } from "./SupervisionPolicyPanel";

vi.mock("@/hooks/useSupervision", () => ({
  useActualizarPoliticaSupervision: vi.fn(),
  usePoliticaSupervision: vi.fn(),
}));

const policyMock = vi.mocked(usePoliticaSupervision);
const updateMock = vi.mocked(useActualizarPoliticaSupervision);
const save = vi.fn();

describe("SupervisionPolicyPanel", () => {
  beforeEach(() => {
    save.mockReset().mockResolvedValue({});
    policyMock.mockReturnValue({
      data: {
        idPublicacion: 41,
        pantallaCompletaObligatoria: true,
        codigoConfiguracion: "personalizada",
        revision: 3,
        modificadoPor: 8,
        fechaModificacion: "2026-10-19T10:00:00.000Z",
        reglas: [{
          id: 2,
          codigo: "foco-largo",
          tipoEvento: "focus_lost",
          metrica: "duracion_individual",
          umbral: 5_000,
          ventanaSegundos: null,
          prioridad: 20,
          accion: "bloquear_interfaz",
          activa: true,
        }],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePoliticaSupervision>);
    updateMock.mockReturnValue({
      mutateAsync: save,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
    } as unknown as ReturnType<typeof useActualizarPoliticaSupervision>);
  });

  it("presenta segundos al docente y envía milisegundos al backend", async () => {
    const user = userEvent.setup();
    render(<SupervisionPolicyPanel idPublicacion={41} />);

    const threshold = screen.getByLabelText(/A partir de \(segundos\)/);
    expect(threshold).toHaveValue(5);
    await user.clear(threshold);
    await user.type(threshold, "7");
    await user.click(screen.getByRole("button", { name: "Guardar supervisión" }));

    expect(save).toHaveBeenCalledWith(expect.objectContaining({
      PantallaCompletaObligatoria: true,
      RevisionEsperada: 3,
      Reglas: [expect.objectContaining({ Umbral: 7_000, Accion: "bloquear_interfaz" })],
    }));
  });
});
