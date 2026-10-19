import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import {
  actualizarPoliticaSupervision,
  aplicarOverrideSupervision,
  obtenerDetalleSupervision,
  obtenerEstadoSupervision,
  obtenerPoliticaSupervision,
} from "./supervision.api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch: vi.fn() };
});

const apiFetchMock = vi.mocked(apiFetch);

describe("servicio de supervisión", () => {
  beforeEach(() => apiFetchMock.mockReset().mockResolvedValue({}));

  it("usa los endpoints de política, estado y detalle", async () => {
    await obtenerPoliticaSupervision(41);
    await obtenerEstadoSupervision(73);
    await obtenerDetalleSupervision(73);
    expect(apiFetchMock).toHaveBeenNthCalledWith(1, "/evaluaciones/publicaciones/41/politica-supervision");
    expect(apiFetchMock).toHaveBeenNthCalledWith(2, "/intentos/73/supervision");
    expect(apiFetchMock).toHaveBeenNthCalledWith(3, "/intentos/73/supervision/detalle");
  });

  it("conserva PascalCase en escrituras y la revisión optimista", async () => {
    const policy = {
      PantallaCompletaObligatoria: false,
      RevisionEsperada: 2,
      Reglas: [{
        Codigo: "aviso-foco",
        TipoEvento: "focus_lost" as const,
        Metrica: "cantidad" as const,
        Umbral: 2,
        VentanaSegundos: null,
        Prioridad: 10,
        Accion: "advertir" as const,
        Activa: true,
      }],
    };
    await actualizarPoliticaSupervision(41, policy);
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/evaluaciones/publicaciones/41/politica-supervision",
      { method: "PUT", body: JSON.stringify(policy) },
    );

    const override = {
      Accion: "desbloquear" as const,
      EventoId: null,
      Motivo: "Falso positivo",
      RevisionEsperada: 3,
    };
    await aplicarOverrideSupervision(73, override);
    expect(apiFetchMock).toHaveBeenLastCalledWith(
      "/intentos/73/supervision/override",
      { method: "PUT", body: JSON.stringify(override) },
    );
  });
});
