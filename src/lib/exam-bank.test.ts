import { describe, expect, it } from "vitest";
import type { BancoGrupoDetalle, BancoPreguntaListado } from "@/types";
import type { ExamQuestionGroup } from "@/lib/schemas/examSchema";
import {
  BankSelectionConflictError,
  buildPendingBankImports,
  toBankGroupPayload,
  withSavedGroupReferences,
} from "./exam-bank";

const question: BancoPreguntaListado = {
  id: 10,
  idDocente: 1,
  titulo: "TCP",
  resumen: "Transporte",
  tipo: "mc",
  estado: "disponible",
  revision: 2,
  fechaCreacion: "2026-09-01T10:00:00.000Z",
  fechaActualizacion: "2026-09-01T10:00:00.000Z",
};

const group: BancoGrupoDetalle = {
  id: 20,
  idDocente: 1,
  tituloReferencia: "Redes",
  estado: "disponible",
  revision: 3,
  fechaCreacion: "2026-09-01T10:00:00.000Z",
  fechaActualizacion: "2026-09-01T10:00:00.000Z",
  etiquetas: [],
  preguntas: [
    {
      id: 11,
      titulo: "UDP",
      tipo: "abierta",
      estado: "disponible",
      revision: 4,
      posicion: 1,
    },
  ],
};

describe("integración del editor con el banco", () => {
  it("crea importaciones con todas las revisiones requeridas", () => {
    const imports = buildPendingBankImports([question], [group]);

    expect(imports.map((item) => item.payload)).toEqual([
      {
        Tipo: "pregunta",
        IdPregunta: 10,
        RevisionEsperada: 2,
        TituloReferencia: "TCP",
      },
      {
        Tipo: "grupo",
        IdGrupo: 20,
        RevisionEsperada: 3,
        Preguntas: [{ IdPregunta: 11, RevisionEsperada: 4 }],
      },
    ]);
  });

  it("impide superponer preguntas individuales y grupos", () => {
    expect(() =>
      buildPendingBankImports(
        [question],
        [{ ...group, preguntas: [{ ...group.preguntas[0], id: 10, titulo: "TCP" }] }],
      ),
    ).toThrow(BankSelectionConflictError);
  });

  it("mezcla referencias existentes y preguntas nuevas al guardar un grupo", () => {
    const examGroup: ExamQuestionGroup = {
      id: 1,
      tituloReferencia: "Redes",
      variantes: [
        {
          id: "existing",
          enunciado: "TCP",
          tipo: "abierta",
          bankReference: { id: 10, revision: 2 },
        },
        {
          id: "4e096ceb-51fd-49a1-8f80-c3760edaf021",
          enunciado: "UDP",
          tipo: "multiple",
          modoJustificacion: "obligatoria",
          estrategiaCorreccion: "parcial_penalizada",
          tratamientoJustificacion: "revision_manual",
          opciones: [
            { texto: "UDP", esCorrecta: true },
            { texto: "TCP", esCorrecta: true },
          ],
        },
      ],
    };

    const payload = toBankGroupPayload(examGroup);
    expect(payload.Preguntas[0]).toEqual({
      Origen: "existente",
      IdPregunta: 10,
      RevisionEsperada: 2,
    });
    expect(payload.Preguntas[1]).toMatchObject({
      Origen: "nueva",
      ClaveCliente: "4e096ceb-51fd-49a1-8f80-c3760edaf021",
      Pregunta: {
        Tipo: "multiple",
        ModoJustificacion: "obligatoria",
        EstrategiaCorreccion: "parcial_penalizada",
        TratamientoJustificacion: "revision_manual",
      },
    });

    const updated = withSavedGroupReferences([examGroup], 0, payload, {
      grupo: { id: 30, revision: 1, estado: "borrador" },
      preguntas: [
        {
          claveCliente: "4e096ceb-51fd-49a1-8f80-c3760edaf021",
          id: 12,
          revision: 1,
        },
      ],
    });
    expect(updated[0].bankReference).toEqual({ id: 30, revision: 1 });
    expect(updated[0].variantes[1].bankReference).toEqual({ id: 12, revision: 1 });
  });
});
