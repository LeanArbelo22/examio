import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDetalleSupervision, useOverrideSupervision } from "@/hooks/useSupervision";
import { AttemptSupervisionPanel } from "./AttemptSupervisionPanel";

vi.mock("@/hooks/useSupervision", () => ({
  useDetalleSupervision: vi.fn(),
  useOverrideSupervision: vi.fn(),
}));

const detailMock = vi.mocked(useDetalleSupervision);
const overrideMock = vi.mocked(useOverrideSupervision);
const applyOverride = vi.fn();
const baseDetail = {
  idIntento: 73,
  estadoSupervision: "bloqueado" as const,
  ultimaAccion: "bloquear_interfaz" as const,
  ultimoEventoId: "4e096ceb-51fd-49a1-8f80-c3760edaf021",
  revisionEstado: 2,
  fechaActualizacion: "2026-10-19T10:00:00.000Z",
  idPublicacionOrigen: 41,
  revisionOrigen: 1,
  codigoConfiguracion: "personalizada",
  pantallaCompletaObligatoria: true,
  fechaSnapshot: "2026-10-19T09:00:00.000Z",
  reglas: [],
  decisiones: [],
  overrides: [],
};

describe("AttemptSupervisionPanel", () => {
  beforeEach(() => {
    applyOverride.mockReset().mockResolvedValue({});
    detailMock.mockReturnValue({
      data: {
        ...baseDetail,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDetalleSupervision>);
    overrideMock.mockReturnValue({
      mutateAsync: applyOverride,
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
    } as unknown as ReturnType<typeof useOverrideSupervision>);
  });

  it("permite desbloquear con motivo y revisión vigente", async () => {
    const user = userEvent.setup();
    render(<AttemptSupervisionPanel idIntento={73} />);
    await user.type(screen.getByLabelText("Motivo de la intervención"), "Falso positivo verificado");
    await user.click(screen.getByRole("button", { name: "Desbloquear interacción" }));
    expect(applyOverride).toHaveBeenCalledWith({
      Accion: "desbloquear",
      EventoId: null,
      Motivo: "Falso positivo verificado",
      RevisionEsperada: 2,
    });
  });

  it("omite las decisiones informativas y conserva las consecuencias relevantes", () => {
    detailMock.mockReturnValue({
      data: {
        ...baseDetail,
        decisiones: [
          {
            id: 1,
            eventoId: "4e096ceb-51fd-49a1-8f80-c3760edaf021",
            idReglaSnapshot: null,
            accion: "informar",
            valorMetrica: 0,
            consecuenciaAplicada: false,
            resultado: "registrada",
            estadoRevision: "pendiente",
            fechaDecision: "2026-10-19T10:00:00.000Z",
            fechaActualizacion: "2026-10-19T10:00:00.000Z",
          },
          {
            id: 2,
            eventoId: "5e096ceb-51fd-49a1-8f80-c3760edaf022",
            idReglaSnapshot: 3,
            accion: "bloquear_interfaz",
            valorMetrica: 2,
            consecuenciaAplicada: true,
            resultado: "aplicada",
            estadoRevision: "pendiente",
            fechaDecision: "2026-10-19T10:01:00.000Z",
            fechaActualizacion: "2026-10-19T10:01:00.000Z",
          },
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDetalleSupervision>);

    render(<AttemptSupervisionPanel idIntento={73} />);

    expect(screen.getAllByText("Bloqueo temporal")).toHaveLength(2);
    expect(screen.queryByText("Sólo registro")).not.toBeInTheDocument();
    expect(screen.queryByText("Evento registrado")).not.toBeInTheDocument();
    expect(screen.queryByText("Sin revisar")).not.toBeInTheDocument();
  });
});
