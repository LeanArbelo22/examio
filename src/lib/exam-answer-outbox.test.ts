import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GuardarRespuestaPayload } from "@/types";

type OutboxModule = typeof import("./exam-answer-outbox");

const answer = (
  idIntento: number,
  idPregunta: number,
  value: number | string,
): GuardarRespuestaPayload => ({
  IdIntento: idIntento,
  IdPregunta: idPregunta,
  ...(typeof value === "number"
    ? { IdOpcionNueva: value }
    : { RtaTexto: value }),
});

async function loadOutbox(): Promise<OutboxModule> {
  return import("./exam-answer-outbox");
}

describe("exam answer outbox", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("conserva la versión nueva frente a una confirmación tardía", async () => {
    const outbox = await loadOutbox();
    const first = await outbox.enqueuePendingAnswer(answer(73, 15, "primera"));
    const latest = await outbox.enqueuePendingAnswer(answer(73, 15, "segunda"));

    await expect(
      outbox.confirmPendingAnswer(first.key, first.version),
    ).resolves.toBe(false);

    const pending = await outbox.getPendingAnswer(73, 15);
    expect(pending?.version).toBe(latest.version);
    expect(pending?.payload.RtaTexto).toBe("segunda");
    expect(pending?.state).toBe("pending");

    await expect(
      outbox.confirmPendingAnswer(latest.key, latest.version),
    ).resolves.toBe(true);
    await expect(outbox.listPendingAnswers(73)).resolves.toEqual([]);
  });

  it("no permite que un error viejo sobrescriba la respuesta más reciente", async () => {
    const outbox = await loadOutbox();
    const first = await outbox.enqueuePendingAnswer(answer(73, 15, 8));
    const latest = await outbox.enqueuePendingAnswer(answer(73, 15, 9));

    await outbox.updatePendingAnswerState(first, "failed", "rechazo tardío");

    const pending = await outbox.getPendingAnswer(73, 15);
    expect(pending?.version).toBe(latest.version);
    expect(pending?.payload.IdOpcionNueva).toBe(9);
    expect(pending?.state).toBe("pending");
    expect(pending?.lastError).toBeUndefined();
  });

  it("persiste solicitud de entrega y aísla intentos diferentes", async () => {
    const outbox = await loadOutbox();
    await outbox.enqueuePendingAnswer(answer(73, 15, 8));
    await outbox.enqueuePendingAnswer(answer(74, 20, "respuesta"));
    await outbox.requestExamFinalization(73);

    await expect(outbox.getExamOutboxSnapshot(73)).resolves.toMatchObject({
      answers: [expect.objectContaining({ idPregunta: 15 })],
      finalizeRequested: true,
      durable: true,
    });
    await expect(outbox.getExamOutboxSnapshot(74)).resolves.toMatchObject({
      answers: [expect.objectContaining({ idPregunta: 20 })],
      finalizeRequested: false,
      durable: true,
    });

    await outbox.clearExamOutbox(73);
    await expect(outbox.getExamOutboxSnapshot(73)).resolves.toEqual({
      answers: [],
      finalizeRequested: false,
      durable: true,
    });
    expect((await outbox.getExamOutboxSnapshot(74)).answers).toHaveLength(1);
  });

  it("notifica cambios y permite desuscribirse", async () => {
    const outbox = await loadOutbox();
    const listener = vi.fn();
    const unsubscribe = outbox.subscribeExamOutbox(listener);

    const record = await outbox.enqueuePendingAnswer(answer(73, 15, 8));
    await outbox.updatePendingAnswerState(record, "pending", "sin conexión");
    await outbox.requestExamFinalization(73);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    await outbox.clearExamFinalizationRequest(73);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("declara el fallback en memoria como no durable", async () => {
    vi.resetModules();
    vi.stubGlobal("indexedDB", undefined);
    const outbox = await loadOutbox();

    await outbox.enqueuePendingAnswer(answer(73, 15, "sin indexedDB"));
    await outbox.requestExamFinalization(73);

    await expect(outbox.getExamOutboxSnapshot(73)).resolves.toMatchObject({
      answers: [
        expect.objectContaining({
          payload: expect.objectContaining({ RtaTexto: "sin indexedDB" }),
        }),
      ],
      finalizeRequested: true,
      durable: false,
    });
  });
});
