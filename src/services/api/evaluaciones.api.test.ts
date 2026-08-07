import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/api";
import { iniciarIntentoExamen } from "./evaluaciones.api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch: vi.fn() };
});

const apiFetchMock = vi.mocked(apiFetch);

describe("iniciarIntentoExamen", () => {
  beforeEach(() => apiFetchMock.mockReset());

  it("normaliza el array de un elemento del contrato efectivo", async () => {
    apiFetchMock.mockResolvedValue([{ idIntento: 73, status: "OK" }]);

    await expect(
      iniciarIntentoExamen({ IdPublicacion: 47, IdAlumno: 30123 }),
    ).resolves.toEqual({ idIntento: 73 });

    expect(apiFetchMock).toHaveBeenCalledWith("/intentos/iniciar", {
      method: "POST",
      body: JSON.stringify({ IdPublicacion: 47, IdAlumno: 30123 }),
    });
  });

  it("rechaza una respuesta upstream sin un intento válido", async () => {
    apiFetchMock.mockResolvedValue([]);

    await expect(
      iniciarIntentoExamen({ IdPublicacion: 47, IdAlumno: 30123 }),
    ).rejects.toMatchObject({
      statusCode: 502,
      code: "INVALID_UPSTREAM_RESPONSE",
    } satisfies Partial<ApiError>);
  });
});
