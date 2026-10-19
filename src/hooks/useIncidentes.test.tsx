import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryTestHarness } from "@/test/query-client";
import { incidenteKeys, reporteKeys } from "@/lib/query-keys";
import {
  obtenerIncidentesPublicacion,
  revisarIncidente,
} from "@/services/api/incidentes.api";
import {
  useIncidentesPublicacion,
  useRevisarIncidente,
} from "./useIncidentes";

vi.mock("@/services/api/incidentes.api", () => ({
  obtenerIncidentesPublicacion: vi.fn(),
  revisarIncidente: vi.fn(),
}));

const listMock = vi.mocked(obtenerIncidentesPublicacion);
const reviewMock = vi.mocked(revisarIncidente);

describe("hooks de incidentes", () => {
  beforeEach(() => {
    listMock.mockReset();
    reviewMock.mockReset();
  });

  it("incluye filtros y publicación en la query key", async () => {
    const data = {
      resumen: {
        totalIncidentes: 0,
        alumnosConIncidentes: 0,
        intentosAnulados: 0,
        incidentesSinRevisar: 0,
      },
      incidentes: [],
      paginacion: { pagina: 1, limite: 10, total: 0, totalPaginas: 0 },
    };
    listMock.mockResolvedValue(data);
    const filtros = { estadoRevision: "pendiente" as const, pagina: 1, limite: 10 };
    const { queryClient, wrapper } = createQueryTestHarness();
    const { result } = renderHook(
      () => useIncidentesPublicacion(41, filtros),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listMock).toHaveBeenCalledWith(41, filtros);
    expect(
      queryClient.getQueryData(incidenteKeys.publicacion(41, filtros)),
    ).toEqual(data);
  });

  it("invalida el listado y los reportes después de revisar", async () => {
    reviewMock.mockResolvedValue({
      id: 1,
      idIncidente: 91,
      idIntento: 73,
      eventoId: "5e096ceb-51fd-49a1-8f80-c3760edaf022",
      revision: 1,
      estado: "revisado",
      actorId: 10,
      actorRol: "docente",
      comentario: null,
      fechaRevision: "2026-10-20T10:00:00.000Z",
      replay: false,
    });
    const { queryClient, wrapper } = createQueryTestHarness();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(() => useRevisarIncidente(41), { wrapper });

    await result.current.mutateAsync({
      idIntento: 73,
      eventoId: "5e096ceb-51fd-49a1-8f80-c3760edaf022",
      idempotencyKey: "4e096ceb-51fd-49a1-8f80-c3760edaf021",
      payload: {
        Estado: "revisado",
        RevisionEsperada: 0,
        Comentario: null,
      },
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: incidenteKeys.publicacionRoot(41),
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: reporteKeys.rendimientoEvaluaciones,
    });
  });
});
