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
  IdOpcionesSeleccionadas: typeof value === "number" ? [value] : [],
  RtaTexto: typeof value === "string" ? value : null,
  Justificacion: null,
  RevisionEsperada: 0,
  EventoId: `00000000-0000-4000-8000-${String(idPregunta).padStart(12, "0")}`,
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
    expect(pending?.payload.IdOpcionesSeleccionadas).toEqual([9]);
    expect(pending?.state).toBe("pending");
    expect(pending?.lastError).toBeUndefined();
  });

  it("preserva el evento en vuelo y rebasa una edición posterior", async () => {
    const outbox = await loadOutbox();
    const first = await outbox.enqueuePendingAnswer(answer(75, 21, 8));
    const sent = await outbox.claimPendingAnswer(first);
    expect(sent?.payload.IdOpcionesSeleccionadas).toEqual([8]);

    const latestPayload = {
      ...answer(75, 21, 9),
      EventoId: "00000000-0000-4000-8000-000000000999",
    };
    await outbox.enqueuePendingAnswer(latestPayload);
    const completion = await outbox.completePendingAnswer(first, sent!, 1);

    expect(completion).toEqual({ confirmed: false, hasNewer: true });
    const pending = await outbox.getPendingAnswer(75, 21);
    expect(pending?.payload.IdOpcionesSeleccionadas).toEqual([9]);
    expect(pending?.payload.RevisionEsperada).toBe(1);
    expect(pending?.payload.EventoId).toBe(latestPayload.EventoId);
    expect(pending?.inFlight).toBeUndefined();
  });

  it("no resucita un evento confirmado cuando el cleanup lo vuelve a persistir", async () => {
    const outbox = await loadOutbox();
    const payload = answer(76, 22, 8);
    const record = await outbox.enqueuePendingAnswer(payload);
    const sent = await outbox.claimPendingAnswer(record);

    await outbox.completePendingAnswer(record, sent!, 1);
    const confirmed = await outbox.getPendingAnswer(76, 22);
    expect(confirmed?.state).toBe("confirmed");
    expect(confirmed?.payload.RevisionEsperada).toBe(1);

    const repeated = await outbox.enqueuePendingAnswer(payload);
    expect(repeated.version).toBe(confirmed?.version);
    expect(repeated.state).toBe("confirmed");
    expect(repeated.payload.RevisionEsperada).toBe(1);
    await expect(outbox.listPendingAnswers(76)).resolves.toEqual([]);
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
