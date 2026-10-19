import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useIncidentesPublicacion,
  useRevisarIncidente,
} from "@/hooks/useIncidentes";
import { useIdempotencyKey } from "@/hooks/useIdempotencyKey";
import { EvaluationIncidentsPanel } from "./EvaluationIncidentsPanel";

vi.mock("@/hooks/useIncidentes", () => ({
  useIncidentesPublicacion: vi.fn(),
  useRevisarIncidente: vi.fn(),
}));

vi.mock("@/hooks/useIdempotencyKey", () => ({
  useIdempotencyKey: vi.fn(),
}));

const listMock = vi.mocked(useIncidentesPublicacion);
const reviewMock = vi.mocked(useRevisarIncidente);
const idempotencyMock = vi.mocked(useIdempotencyKey);
const mutateAsync = vi.fn();
const complete = vi.fn();
const resetMutation = vi.fn();

const listData = {
  resumen: {
    totalIncidentes: 3,
    alumnosConIncidentes: 2,
    intentosAnulados: 1,
    incidentesSinRevisar: 1,
  },
  incidentes: [
    {
      idIncidente: 91,
      eventoId: "5e096ceb-51fd-49a1-8f80-c3760edaf022",
      idIntento: 73,
      tipo: "fullscreen_exit",
      fechaInicioCliente: "2026-10-20T10:00:00.000Z",
      fechaFinCliente: "2026-10-20T10:00:06.000Z",
      duracionMilisegundos: 6_000,
      estadoEvento: "completo",
      idAlumno: 30123,
      numeroIntento: 2,
      estadoIntento: "anulado" as const,
      alumnoNombre: "Ada",
      alumnoApellido: "Lovelace",
      severidad: "anular_intento" as const,
      estadoRevision: "pendiente" as const,
      revision: 0,
      comentario: null,
      actorId: null,
      actorRol: null,
      fechaRevision: null,
    },
  ],
  paginacion: { pagina: 1, limite: 10, total: 1, totalPaginas: 1 },
};

describe("EvaluationIncidentsPanel", () => {
  beforeEach(() => {
    mutateAsync.mockReset().mockResolvedValue({});
    complete.mockReset();
    resetMutation.mockReset();
    listMock.mockReturnValue({
      data: listData,
      isLoading: false,
      isError: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useIncidentesPublicacion>);
    reviewMock.mockReturnValue({
      mutateAsync,
      isPending: false,
      isError: false,
      error: null,
      reset: resetMutation,
    } as unknown as ReturnType<typeof useRevisarIncidente>);
    idempotencyMock.mockReturnValue({
      keyFor: vi.fn(() => "4e096ceb-51fd-49a1-8f80-c3760edaf021"),
      complete,
    });
  });

  it("muestra el resumen y aclara el alcance operativo", async () => {
    const user = userEvent.setup();
    render(<EvaluationIncidentsPanel idPublicacion={41} />);

    await user.click(screen.getByText("Ver y revisar incidentes"));

    expect(screen.getByText("Incidentes de la evaluación")).toBeVisible();
    expect(screen.getByText(/no implica fraude ni modifica la nota/i)).toBeVisible();
    expect(screen.getAllByText("Salida de pantalla completa")).toHaveLength(2);
    expect(screen.getByText("Lovelace, Ada · Intento 2")).toBeVisible();
    expect(screen.getByRole("link", { name: "Ver intento" })).toHaveAttribute(
      "href",
      "/profesor/intento/73",
    );
  });

  it("descarta un incidente conservando la revisión esperada", async () => {
    const user = userEvent.setup();
    render(<EvaluationIncidentsPanel idPublicacion={41} />);

    await user.click(screen.getByText("Ver y revisar incidentes"));

    await user.click(
      screen.getByRole("button", { name: "Actualizar revisión" }),
    );
    await user.selectOptions(
      screen.getByLabelText("Resultado de la revisión"),
      "descartado",
    );
    await user.type(
      screen.getByLabelText("Comentario opcional"),
      "Falso positivo verificado",
    );
    await user.click(screen.getByRole("button", { name: "Guardar revisión" }));

    expect(mutateAsync).toHaveBeenCalledWith({
      idIntento: 73,
      eventoId: "5e096ceb-51fd-49a1-8f80-c3760edaf022",
      idempotencyKey: "4e096ceb-51fd-49a1-8f80-c3760edaf021",
      payload: {
        Estado: "descartado",
        RevisionEsperada: 0,
        Comentario: "Falso positivo verificado",
      },
    });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/Su registro se conserva/i),
    ).toBeVisible();
  });
});
