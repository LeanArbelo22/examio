import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/lib/api";
import type {
  BancoGrupoDesdeContenidoPayload,
  BancoImportarEnEvaluacionPayload,
  BancoPreguntaPayload,
} from "@/types";
import {
  crearGrupoBancoDesdeContenido,
  crearPreguntaBanco,
  importarBancoEnEvaluacion,
  listarPreguntasBanco,
} from "./banco-preguntas.api";

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch: vi.fn() };
});

const apiFetchMock = vi.mocked(apiFetch);
const idempotencyKey = "4e096ceb-51fd-49a1-8f80-c3760edaf021";

describe("servicio del banco de preguntas", () => {
  beforeEach(() => apiFetchMock.mockReset());

  it("serializa todos los filtros del listado con nombres del contrato", async () => {
    apiFetchMock.mockResolvedValue({ items: [], total: 0, pagina: 2, tamano: 10 });

    await listarPreguntasBanco({
      texto: "TCP",
      estado: "disponible",
      tipo: "mc",
      etiqueta: 3,
      pagina: 2,
      tamano: 10,
    });

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/banco-preguntas/preguntas?texto=TCP&estado=disponible&tipo=mc&etiqueta=3&pagina=2&tamano=10",
    );
  });

  it("envía PascalCase y conserva la clave idempotente al crear una pregunta", async () => {
    const payload: BancoPreguntaPayload = {
      Titulo: "Protocolos",
      Enunciado: "¿Cuál corresponde a transporte?",
      Tipo: "mc",
      Opciones: [
        { Texto: "TCP", EsCorrecta: true },
        { Texto: "RAM", EsCorrecta: false },
      ],
      Etiquetas: [3],
    };
    apiFetchMock.mockResolvedValue({ id: 10 });

    await crearPreguntaBanco(payload, idempotencyKey);

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/banco-preguntas/preguntas",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
      },
    );
  });

  it("mantiene la unión discriminada y la clave al crear un grupo compuesto", async () => {
    const payload: BancoGrupoDesdeContenidoPayload = {
      TituloReferencia: "Redes",
      Preguntas: [
        { Origen: "existente", IdPregunta: 10, RevisionEsperada: 2 },
        {
          Origen: "nueva",
          ClaveCliente: idempotencyKey,
          Pregunta: { Titulo: "TCP", Tipo: "mc", Opciones: [] },
        },
      ],
    };
    apiFetchMock.mockResolvedValue({
      grupo: { id: 20, revision: 1, estado: "borrador" },
      preguntas: [{ claveCliente: idempotencyKey, id: 11, revision: 1 }],
    });

    await crearGrupoBancoDesdeContenido(payload, idempotencyKey);

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/banco-preguntas/grupos/desde-contenido",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
      },
    );
  });

  it("importa al borrador usando la actividad y la misma clave de operación", async () => {
    const payload: BancoImportarEnEvaluacionPayload = {
      ImportacionesBanco: [
        {
          Tipo: "pregunta",
          IdPregunta: 10,
          RevisionEsperada: 2,
          TituloReferencia: "Redes",
        },
      ],
    };
    apiFetchMock.mockResolvedValue({ importaciones: [], revision: 3 });

    await importarBancoEnEvaluacion(42, payload, idempotencyKey);

    expect(apiFetchMock).toHaveBeenCalledWith(
      "/evaluaciones/42/importar-banco",
      {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(payload),
      },
    );
  });
});
