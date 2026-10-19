import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import { useContenidoRevision, useDisponibilidadRevision, useEmitirSesionRevision } from "@/hooks/useRevisiones";
import RevisionAlumnoPage from "./page";

vi.mock("@/hooks/useRevisiones", () => ({
  useContenidoRevision: vi.fn(),
  useDisponibilidadRevision: vi.fn(),
  useEmitirSesionRevision: vi.fn(),
}));
vi.mock("@/hooks/useIdempotencyKey", () => ({ useIdempotencyKey: vi.fn() }));

const availabilityMock = vi.mocked(useDisponibilidadRevision);
const issueMock = vi.mocked(useEmitirSesionRevision);
const contentMock = vi.mocked(useContenidoRevision);
const idempotencyMock = vi.mocked(useIdempotencyKey);
const mutateAsync = vi.fn();
const keyFor = vi.fn(() => "4e096ceb-51fd-49a1-8f80-c3760edaf021");
const complete = vi.fn();

describe("RevisionAlumnoPage", () => {
  beforeEach(() => {
    mutateAsync.mockReset().mockResolvedValue({
      idSesion: "session-1", idIntento: 73, acceso: "unico",
      fechaEmision: "2026-10-19T10:00:00.000Z",
      fechaExpiracion: new Date(Date.now() + 300_000).toISOString(),
      reutilizada: false,
    });
    keyFor.mockClear();
    complete.mockClear();
    idempotencyMock.mockReturnValue({ keyFor, complete });
    availabilityMock.mockReturnValue({
      data: {
        idIntento: 73, idPublicacion: 9, revisionDisponible: true,
        motivo: "POLICY_ALLOWED", acceso: "unico", origen: "general",
        modo: "al_corregir", revisionPolitica: 1, idPermiso: null, esIntentoValido: true,
        disponibleDesde: null, disponibleHasta: null,
        duracionSesionSegundos: 300, accesoUnicoConsumido: false,
      },
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDisponibilidadRevision>);
    issueMock.mockReturnValue({
      mutateAsync, isPending: false, isError: false, error: null,
    } as unknown as ReturnType<typeof useEmitirSesionRevision>);
    contentMock.mockReturnValue({
      data: undefined, isLoading: false, isError: false, error: null,
    } as unknown as ReturnType<typeof useContenidoRevision>);
  });

  it("advierte y emite una sesión idempotente sólo cuando el alumno decide abrir", async () => {
    const user = userEvent.setup();
    await act(async () => render(<RevisionAlumnoPage params={Promise.resolve({ idIntento: "73" })} />));

    expect(screen.getByText(/Podés abrir esta revisión una sola vez/)).toBeVisible();
    expect(mutateAsync).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Abrir revisión" }));

    expect(keyFor).toHaveBeenCalledWith({ idIntento: 73 });
    expect(mutateAsync).toHaveBeenCalledWith("4e096ceb-51fd-49a1-8f80-c3760edaf021");
    expect(complete).toHaveBeenCalledOnce();
  });

  it("muestra el contenido obtenido desde la sesión y las claves correctas", async () => {
    contentMock.mockReturnValue({
      data: {
        idSesion: "session-1",
        acceso: "libre",
        contenido: {
          idIntento: 73, idPublicacion: 9, estado: "entregado",
          notaFinal: 7, notaAutomatica: 7, notaFinalCalculada: 7, notaFinalManual: null,
          fechaInicio: "2026-10-12T12:00:00.000Z", fechaFin: "2026-10-12T13:00:00.000Z",
          numeroIntento: 1, correccionConfirmada: true, tituloEvaluacion: "Redes",
          escalaCalificacion: 10, notaAprobacion: 4,
          preguntas: [{
            idIntentoPregunta: 100, idPregunta: 20, enunciado: "Elegí protocolos",
            tipo: "multiple", grupo: "TCP/IP", puntajeMaximo: 1, puntajeObtenido: 1,
            origenCorreccion: "automatica", comentariosDocente: null, respuesta: null,
            opciones: [
              { idOpcion: 1, texto: "TCP", esCorrecta: true, fueSeleccionada: true },
              { idOpcion: 2, texto: "FTP", esCorrecta: false, fueSeleccionada: false },
            ],
          }],
        },
      },
      isLoading: false, isError: false, error: null,
    } as unknown as ReturnType<typeof useContenidoRevision>);

    const user = userEvent.setup();
    await act(async () => render(<RevisionAlumnoPage params={Promise.resolve({ idIntento: "73" })} />));
    await user.click(screen.getByRole("button", { name: "Abrir revisión" }));
    expect(screen.getByRole("heading", { name: "Redes" })).toBeVisible();
    expect(screen.getByText("Correcta y elegida")).toBeVisible();
  });

  it("retira el contenido cuando vence el plazo informado por la API", async () => {
    const user = userEvent.setup();
    const now = Date.now();
    mutateAsync.mockResolvedValue({
      idSesion: "session-1", idIntento: 73, acceso: "libre",
      fechaEmision: new Date(now).toISOString(),
      fechaExpiracion: new Date(now + 100).toISOString(),
      reutilizada: false,
    });
    contentMock.mockReturnValue({
      data: {
        idSesion: "session-1", acceso: "libre",
        contenido: {
          idIntento: 73, idPublicacion: 9, estado: "entregado",
          notaFinal: 7, notaAutomatica: 7, notaFinalCalculada: 7, notaFinalManual: null,
          fechaInicio: "2026-10-12T12:00:00.000Z", fechaFin: "2026-10-12T13:00:00.000Z",
          numeroIntento: 1, correccionConfirmada: true, tituloEvaluacion: "Redes",
          escalaCalificacion: 10, notaAprobacion: 4, preguntas: [],
        },
      },
      isLoading: false, isError: false, error: null,
    } as unknown as ReturnType<typeof useContenidoRevision>);

    await act(async () => render(<RevisionAlumnoPage params={Promise.resolve({ idIntento: "73" })} />));
    await user.click(screen.getByRole("button", { name: "Abrir revisión" }));
    expect(screen.getByRole("heading", { name: "Redes" })).toBeVisible();
    await waitFor(() => expect(screen.getByRole("heading", { name: "El tiempo de revisión terminó" })).toBeVisible());
    expect(screen.queryByRole("heading", { name: "Redes" })).not.toBeInTheDocument();
  });

  it("explica por qué una revisión no está disponible", async () => {
    availabilityMock.mockReturnValue({
      data: { revisionDisponible: false, motivo: "POLICY_MANUAL" },
      isLoading: false, isError: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useDisponibilidadRevision>);
    await act(async () => render(<RevisionAlumnoPage params={Promise.resolve({ idIntento: "73" })} />));
    expect(screen.getByText(/requiere una autorización individual/)).toBeVisible();
  });
});
