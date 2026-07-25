import type { GuardarRespuestaPayload } from "@/types/index";

export type PendingAnswerState = "pending" | "failed" | "confirmed";

export interface PendingAnswerRecord {
  key: string;
  version: string;
  idIntento: number;
  idPregunta: number;
  payload: GuardarRespuestaPayload;
  state: PendingAnswerState;
  updatedAt: number;
  attempts: number;
  lastError?: string;
}

export interface ExamOutboxSnapshot {
  answers: PendingAnswerRecord[];
  finalizeRequested: boolean;
  durable: boolean;
}

const DATABASE_NAME = "examio-exam-outbox";
const DATABASE_VERSION = 1;
const ANSWERS_STORE = "answers";
const META_STORE = "meta";

const memoryAnswers = new Map<string, PendingAnswerRecord>();
const memoryFinalizeRequests = new Set<number>();
const listeners = new Set<() => void>();
let databasePromise: Promise<IDBDatabase> | null = null;
let durableStorageAvailable = true;

function answerKey(idIntento: number, idPregunta: number): string {
  return `${idIntento}:${idPregunta}`;
}

function finalizeKey(idIntento: number): string {
  return `finalize:${idIntento}`;
}

function createVersion(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function notifyListeners(): void {
  for (const listener of listeners) listener();
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB no está disponible");
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(ANSWERS_STORE)) {
        const store = database.createObjectStore(ANSWERS_STORE, {
          keyPath: "key",
        });
        store.createIndex("idIntento", "idIntento");
      }
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch((error) => {
    databasePromise = null;
    durableStorageAvailable = false;
    throw error;
  });

  return databasePromise;
}

async function withDurableStorage<T>(
  operation: (database: IDBDatabase) => Promise<T>,
  fallback: () => T | Promise<T>,
): Promise<T> {
  if (!durableStorageAvailable) return fallback();
  try {
    return await operation(await openDatabase());
  } catch {
    durableStorageAvailable = false;
    return fallback();
  }
}

export function subscribeExamOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function enqueuePendingAnswer(
  payload: GuardarRespuestaPayload,
): Promise<PendingAnswerRecord> {
  const key = answerKey(payload.IdIntento, payload.IdPregunta);
  const record: PendingAnswerRecord = {
    key,
    version: createVersion(),
    idIntento: payload.IdIntento,
    idPregunta: payload.IdPregunta,
    payload,
    state: "pending",
    updatedAt: Date.now(),
    attempts: 0,
  };

  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(ANSWERS_STORE, "readwrite");
      transaction.objectStore(ANSWERS_STORE).put(record);
      await transactionComplete(transaction);
    },
    () => {
      memoryAnswers.set(key, record);
    },
  );
  memoryAnswers.set(key, record);
  notifyListeners();
  return record;
}

export async function getPendingAnswer(
  idIntento: number,
  idPregunta: number,
): Promise<PendingAnswerRecord | undefined> {
  const key = answerKey(idIntento, idPregunta);
  return withDurableStorage(
    async (database) => {
      const transaction = database.transaction(ANSWERS_STORE, "readonly");
      return requestResult(
        transaction.objectStore(ANSWERS_STORE).get(key),
      ) as Promise<PendingAnswerRecord | undefined>;
    },
    () => memoryAnswers.get(key),
  );
}

export async function listPendingAnswers(
  idIntento: number,
): Promise<PendingAnswerRecord[]> {
  return withDurableStorage(
    async (database) => {
      const transaction = database.transaction(ANSWERS_STORE, "readonly");
      const records = await requestResult(
        transaction.objectStore(ANSWERS_STORE).index("idIntento").getAll(idIntento),
      ) as PendingAnswerRecord[];
      return records
        .filter((record) => record.state !== "confirmed")
        .sort((a, b) => a.updatedAt - b.updatedAt);
    },
    () =>
      [...memoryAnswers.values()]
        .filter(
          (record) =>
            record.idIntento === idIntento && record.state !== "confirmed",
        )
        .sort((a, b) => a.updatedAt - b.updatedAt),
  );
}

export async function confirmPendingAnswer(
  key: string,
  version: string,
): Promise<boolean> {
  const confirmed = await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(ANSWERS_STORE, "readwrite");
      const store = transaction.objectStore(ANSWERS_STORE);
      const current = await requestResult(store.get(key)) as
        | PendingAnswerRecord
        | undefined;
      if (current?.version !== version) {
        transaction.abort();
        return false;
      }
      store.put({
        ...current,
        state: "confirmed",
        lastError: undefined,
      });
      await transactionComplete(transaction);
      return true;
    },
    () => {
      const current = memoryAnswers.get(key);
      if (current?.version !== version) return false;
      memoryAnswers.set(key, {
        ...current,
        state: "confirmed",
        lastError: undefined,
      });
      return true;
    },
  );

  const memoryRecord = memoryAnswers.get(key);
  if (confirmed && memoryRecord?.version === version) {
    memoryAnswers.set(key, {
      ...memoryRecord,
      state: "confirmed",
      lastError: undefined,
    });
  }
  if (confirmed) notifyListeners();
  return confirmed;
}

export async function updatePendingAnswerState(
  record: PendingAnswerRecord,
  state: PendingAnswerState,
  lastError?: string,
): Promise<void> {
  const current = await getPendingAnswer(record.idIntento, record.idPregunta);
  if (current?.version !== record.version) return;

  const updated: PendingAnswerRecord = {
    ...current,
    state,
    attempts: current.attempts + 1,
    lastError,
  };
  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(ANSWERS_STORE, "readwrite");
      transaction.objectStore(ANSWERS_STORE).put(updated);
      await transactionComplete(transaction);
    },
    () => {
      memoryAnswers.set(updated.key, updated);
    },
  );
  memoryAnswers.set(updated.key, updated);
  notifyListeners();
}

export async function requestExamFinalization(idIntento: number): Promise<void> {
  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(META_STORE, "readwrite");
      transaction.objectStore(META_STORE).put({
        key: finalizeKey(idIntento),
        idIntento,
        requestedAt: Date.now(),
      });
      await transactionComplete(transaction);
    },
    () => {
      memoryFinalizeRequests.add(idIntento);
    },
  );
  memoryFinalizeRequests.add(idIntento);
  notifyListeners();
}

export async function clearExamFinalizationRequest(
  idIntento: number,
): Promise<void> {
  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(META_STORE, "readwrite");
      transaction.objectStore(META_STORE).delete(finalizeKey(idIntento));
      await transactionComplete(transaction);
    },
    () => {
      memoryFinalizeRequests.delete(idIntento);
    },
  );
  memoryFinalizeRequests.delete(idIntento);
  notifyListeners();
}

export async function clearExamOutbox(idIntento: number): Promise<void> {
  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(
        [ANSWERS_STORE, META_STORE],
        "readwrite",
      );
      const answerStore = transaction.objectStore(ANSWERS_STORE);
      const records = await requestResult(
        answerStore.index("idIntento").getAll(idIntento),
      ) as PendingAnswerRecord[];
      for (const record of records) answerStore.delete(record.key);
      transaction
        .objectStore(META_STORE)
        .delete(finalizeKey(idIntento));
      await transactionComplete(transaction);
    },
    () => {
      for (const [key, record] of memoryAnswers) {
        if (record.idIntento === idIntento) memoryAnswers.delete(key);
      }
      memoryFinalizeRequests.delete(idIntento);
    },
  );
  for (const [key, record] of memoryAnswers) {
    if (record.idIntento === idIntento) memoryAnswers.delete(key);
  }
  memoryFinalizeRequests.delete(idIntento);
  notifyListeners();
}

export async function getExamOutboxSnapshot(
  idIntento: number,
): Promise<ExamOutboxSnapshot> {
  const [answers, finalizeRequested] = await Promise.all([
    listPendingAnswers(idIntento),
    withDurableStorage(
      async (database) => {
        const transaction = database.transaction(META_STORE, "readonly");
        const value = await requestResult(
          transaction.objectStore(META_STORE).get(finalizeKey(idIntento)),
        );
        return Boolean(value);
      },
      () => memoryFinalizeRequests.has(idIntento),
    ),
  ]);

  return {
    answers,
    finalizeRequested,
    durable: durableStorageAvailable,
  };
}
