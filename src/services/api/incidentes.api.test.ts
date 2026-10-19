import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import {
  obtenerIncidentesPublicacion,
  revisarIncidente,
} from "./incidentes.api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch: vi.fn() };
});

const apiFetchMock = vi.mocked(apiFetch);

describe("servicio de visibilidad de incidentes", () => {
  beforeEach(() => {
    apiFetchMock.mockReset().mockResolvedValue({});
  });

  it("consulta los incidentes paginados con filtros operativos", async () => {
    await obtenerIncidentesPublicacion(41, {
      tipoIncidente: "focus_lost",
      severidad: "advertir",
      estadoRevision: "pendiente",
      pagina: 2,
      limite: 10,
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/evaluaciones/publicaciones/41/incidentes?tipoIncidente=focus_lost&severidad=advertir&estadoRevision=pendiente&pagina=2&limite=10",
    );
  });

  it("envía revisión esperada e idempotencia al revisar", async () => {
    const key = "4e096ceb-51fd-49a1-8f80-c3760edaf021";
    await revisarIncidente(
      73,
      "5e096ceb-51fd-49a1-8f80-c3760edaf022",
      {
        Estado: "descartado",
        RevisionEsperada: 2,
        Comentario: "Falso positivo verificado",
      },
      key,
    );

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/telemetria/intentos/73/incidentes/5e096ceb-51fd-49a1-8f80-c3760edaf022/revision",
      {
        method: "PUT",
        headers: { "Idempotency-Key": key },
        body: JSON.stringify({
          Estado: "descartado",
          RevisionEsperada: 2,
          Comentario: "Falso positivo verificado",
        }),
      },
    );
  });
});
