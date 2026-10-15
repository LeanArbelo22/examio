import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type OutboxModule = typeof import("./attempt-cancellation-outbox");

async function loadOutbox(): Promise<OutboxModule> {
  return import("./attempt-cancellation-outbox");
}

describe("attempt cancellation outbox", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("indexedDB", new IDBFactory());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("conserva el primer incidente ante eventos duplicados", async () => {
    const outbox = await loadOutbox();
    const first = await outbox.enqueueAttemptCancellation(
      73,
      "4e096ceb-51fd-49a1-8f80-c3760edaf021",
      "focus_lost",
    );
    const duplicate = await outbox.enqueueAttemptCancellation(
      73,
      "5e096ceb-51fd-49a1-8f80-c3760edaf022",
      "fullscreen_exit",
    );

    expect(duplicate.eventoId).toBe(first.eventoId);
    expect(duplicate.tipoIncidente).toBe("focus_lost");
  });

  it("elimina únicamente la versión confirmada", async () => {
    const outbox = await loadOutbox();
    const record = await outbox.enqueueAttemptCancellation(
      73,
      "4e096ceb-51fd-49a1-8f80-c3760edaf021",
      "focus_lost",
    );

    await expect(outbox.removeAttemptCancellation({
      key: record.key,
      version: "otra-version",
    })).resolves.toBe(false);
    await expect(outbox.getAttemptCancellation(73)).resolves.toBeDefined();
    await expect(outbox.removeAttemptCancellation(record)).resolves.toBe(true);
    await expect(outbox.getAttemptCancellation(73)).resolves.toBeUndefined();
  });
});
