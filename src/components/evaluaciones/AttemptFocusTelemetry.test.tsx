import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useEventosTemporales } from "@/hooks/useTelemetria";
import type { EventoTemporal } from "@/types";
import { AttemptFocusTelemetry } from "./AttemptFocusTelemetry";

vi.mock("@/hooks/useTelemetria", () => ({
  useEventosTemporales: vi.fn(),
}));

const event = (
  eventoId: string,
  tipo: EventoTemporal["tipo"],
  fechaInicioCliente: string,
  overrides: Partial<EventoTemporal> = {},
): EventoTemporal => ({
  id: Number(eventoId),
  eventoId,
  idIntento: 73,
  tipo,
  idIntentoPregunta: null,
  sesionClienteId: "50f8b18c-c03a-46fd-b830-ea3fc2d53f50",
  secuenciaCliente: Number(eventoId),
  fechaInicioCliente,
  fechaFinCliente: fechaInicioCliente,
  duracionMilisegundos: 0,
  codigo: null,
  versionContrato: 1,
  fechaRecepcionInicio: fechaInicioCliente,
  fechaRecepcionFin: fechaInicioCliente,
  estado: "completado",
  esIntervalo: false,
  esIncidente: false,
  ...overrides,
});

describe("AttemptFocusTelemetry", () => {
  it("prioriza información docente y oculta los intervalos de pregunta en más detalles", () => {
    vi.mocked(useEventosTemporales).mockReturnValue({
      data: {
        items: [
          event("1", "exam_resumed", "2026-10-15T13:00:00.000Z"),
          event("2", "exam_resumed", "2026-10-15T13:00:00.200Z"),
          event("3", "question_active", "2026-10-15T13:00:01.000Z", {
            idIntentoPregunta: 83,
            fechaFinCliente: "2026-10-15T13:00:32.800Z",
            duracionMilisegundos: 31_800,
            esIntervalo: true,
          }),
          event("4", "focus_lost", "2026-10-15T13:00:10.000Z", {
            fechaFinCliente: "2026-10-15T13:00:13.200Z",
            duracionMilisegundos: 3_200,
            esIntervalo: true,
            esIncidente: true,
          }),
        ],
        resumen: {
          total: 4,
          intervalosAbiertos: 0,
          duracionesPorTipo: [{ tipo: "focus_lost", duracionMilisegundos: 3_200 }],
          tiemposPorPregunta: [
            {
              idIntentoPregunta: 83,
              idPregunta: 15,
              duracionMilisegundos: 31_800,
              fuente: "nueva",
            },
            {
              idIntentoPregunta: 84,
              idPregunta: 16,
              duracionMilisegundos: 12_200,
              fuente: "nueva",
            },
          ],
        },
        paginacion: { pagina: 1, limite: 100, total: 4, totalPaginas: 1 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    render(<AttemptFocusTelemetry idIntento={73} />);

    expect(screen.getByText("44 s")).toBeVisible();
    expect(screen.getAllByText("3.2 s")).toHaveLength(2);
    expect(screen.getByText("2 de 2")).toBeVisible();
    expect(screen.queryByText("Intervalos abiertos")).not.toBeInTheDocument();
    expect(screen.getAllByText("Examen iniciado")).toHaveLength(1);
    expect(screen.queryByText("Examen reanudado")).not.toBeInTheDocument();
    expect(screen.getByText("Más detalles")).toBeVisible();
    expect(screen.queryByText("Pregunta activa")).not.toBeInTheDocument();
  });
});
