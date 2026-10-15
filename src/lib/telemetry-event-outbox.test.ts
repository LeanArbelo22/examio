import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";

type OutboxModule = typeof import("./telemetry-event-outbox");

async function loadOutbox(): Promise<OutboxModule> {
  vi.resetModules();
  return import("./telemetry-event-outbox");
}

describe("temporal telemetry outbox", () => {
  beforeEach(() => {
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  it("conserva sesión y asigna secuencias crecientes", async () => {
    const outbox = await loadOutbox();
    const first = await outbox.enqueueTelemetryEvent(73, {
      Tipo: "exam_resumed",
      FechaInicioCliente: "2026-10-14T14:00:00.000Z",
    });
    const second = await outbox.enqueueTelemetryEvent(73, {
      Tipo: "page_reload",
      FechaInicioCliente: "2026-10-14T14:00:01.000Z",
    });

    expect(second.payload.SesionClienteId).toBe(first.payload.SesionClienteId);
    expect(second.payload.SecuenciaCliente).toBe(
      first.payload.SecuenciaCliente + 1,
    );
  });

  it("mantiene el evento abierto después de sincronizar y lo elimina al confirmar el cierre", async () => {
    const outbox = await loadOutbox();
    const opened = await outbox.enqueueTelemetryEvent(73, {
      Tipo: "question_active",
      IdIntentoPregunta: 83,
      FechaInicioCliente: "2026-10-14T14:00:00.000Z",
    });

    await outbox.acknowledgeTelemetryEvent(opened);
    const synced = (await outbox.listTelemetryEvents(73))[0];
    expect(synced).toMatchObject({ eventoId: opened.eventoId, state: "synced" });

    const completed = await outbox.completeTelemetryEvent(
      synced,
      "2026-10-14T14:00:30.000Z",
      30_000,
    );
    expect(completed?.payload).toMatchObject({
      SesionClienteId: opened.payload.SesionClienteId,
      SecuenciaCliente: opened.payload.SecuenciaCliente,
      DuracionMilisegundos: 30_000,
    });

    await outbox.acknowledgeTelemetryEvent(completed!);
    expect(await outbox.listTelemetryEvents(73)).toEqual([]);
  });
});
