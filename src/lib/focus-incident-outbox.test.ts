import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type OutboxModule = typeof import("./focus-incident-outbox");

async function loadOutbox(): Promise<OutboxModule> {
  return import("./focus-incident-outbox");
}

describe("focus incident outbox", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("conserva el cierre si una confirmación del inicio llega tarde", async () => {
    const outbox = await loadOutbox();
    const start = await outbox.saveFocusIncident(73, "event-1", {
      Tipo: "focus_lost",
      FechaInicioCliente: "2026-10-12T10:15:00.000Z",
    });
    const completed = await outbox.saveFocusIncident(73, "event-1", {
      Tipo: "focus_lost",
      FechaInicioCliente: "2026-10-12T10:15:00.000Z",
      FechaFinCliente: "2026-10-12T10:15:20.000Z",
      DuracionMilisegundos: 20000,
    });

    await expect(outbox.removeFocusIncident(start)).resolves.toBe(false);
    await expect(outbox.listFocusIncidents(73)).resolves.toEqual([
      expect.objectContaining({
        version: completed.version,
        payload: expect.objectContaining({ DuracionMilisegundos: 20000 }),
      }),
    ]);
  });

  it("informa cuando sólo puede conservar eventos en memoria", async () => {
    vi.resetModules();
    vi.stubGlobal("indexedDB", undefined);
    const outbox = await loadOutbox();

    await outbox.saveFocusIncident(73, "event-2", {
      Tipo: "focus_lost",
      FechaInicioCliente: "2026-10-12T10:15:00.000Z",
    });

    expect(outbox.isFocusOutboxDurable()).toBe(false);
    await expect(outbox.listFocusIncidents(73)).resolves.toHaveLength(1);
  });
});
