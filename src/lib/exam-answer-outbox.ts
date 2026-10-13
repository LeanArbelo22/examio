import type { GuardarRespuestaPayload } from "@/types/index";

export type PendingAnswerState =
  | "pending"
  | "syncing"
  | "failed"
  | "conflict"
  | "confirmed";

export interface PendingAnswerInFlight {
  version: string;
  payload: GuardarRespuestaPayload;
}

export interface PendingAnswerRecord {
  key: string;
  version: string;
  idIntento: number;
  idPregunta: number;
  payload: GuardarRespuestaPayload;
  inFlight?: PendingAnswerInFlight;
  state: PendingAnswerState;
  updatedAt: number;
  attempts: number;
  lastError?: string;
  lastErrorCode?: string;
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

function createEventId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function answerContent(payload: GuardarRespuestaPayload): string {
  const selectedOptions = payload.IdOpcionesSeleccionadas ??
    (payload.IdOpcionNueva !== undefined ? [payload.IdOpcionNueva] : []);
  return JSON.stringify({
    selectedOptions: [...selectedOptions].sort((a, b) => a - b),
    text: payload.RtaTexto ?? null,
    justification: payload.Justificacion ?? null,
  });
}

function isSameAnswerEvent(
  current: PendingAnswerRecord | undefined,
  payload: GuardarRespuestaPayload,
): boolean {
  return Boolean(
    current?.payload.EventoId &&
      payload.EventoId &&
      current.payload.EventoId === payload.EventoId &&
      answerContent(current.payload) === answerContent(payload),
  );
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
  const version = createVersion();
  let record: PendingAnswerRecord | undefined;

  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(ANSWERS_STORE, "readwrite");
      const store = transaction.objectStore(ANSWERS_STORE);
      const current = await requestResult(store.get(key)) as
        | PendingAnswerRecord
        | undefined;
      if (isSameAnswerEvent(current, payload)) {
        record = current;
        await transactionComplete(transaction);
        return;
      }
      record = {
        key,
        version,
        idIntento: payload.IdIntento,
        idPregunta: payload.IdPregunta,
        payload,
        inFlight: current?.state === "failed" ? undefined : current?.inFlight,
        state: current?.state === "conflict"
          ? "conflict"
          : current?.inFlight && current.state !== "failed"
            ? "syncing"
            : "pending",
        updatedAt: Date.now(),
        attempts: current?.attempts ?? 0,
        lastError: current?.state === "conflict" ? current.lastError : undefined,
        lastErrorCode:
          current?.state === "conflict" ? current.lastErrorCode : undefined,
      };
      store.put(record);
      await transactionComplete(transaction);
    },
    () => {
      const current = memoryAnswers.get(key);
      if (isSameAnswerEvent(current, payload)) {
        record = current;
        return;
      }
      record = {
        key,
        version,
        idIntento: payload.IdIntento,
        idPregunta: payload.IdPregunta,
        payload,
        inFlight: current?.state === "failed" ? undefined : current?.inFlight,
        state: current?.state === "conflict"
          ? "conflict"
          : current?.inFlight && current.state !== "failed"
            ? "syncing"
            : "pending",
        updatedAt: Date.now(),
        attempts: current?.attempts ?? 0,
        lastError: current?.state === "conflict" ? current.lastError : undefined,
        lastErrorCode:
          current?.state === "conflict" ? current.lastErrorCode : undefined,
      };
      memoryAnswers.set(key, record);
    },
  );
  if (!record) throw new Error("No se pudo conservar la respuesta pendiente");
  memoryAnswers.set(key, record);
  notifyListeners();
  return record;
}

export async function claimPendingAnswer(
  record: PendingAnswerRecord,
): Promise<PendingAnswerInFlight | undefined> {
  let claimed: PendingAnswerInFlight | undefined;
  let updated: PendingAnswerRecord | undefined;
  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(ANSWERS_STORE, "readwrite");
      const store = transaction.objectStore(ANSWERS_STORE);
      const current = await requestResult(store.get(record.key)) as
        | PendingAnswerRecord
        | undefined;
      if (!current || current.state === "failed" || current.state === "conflict" || current.state === "confirmed") {
        await transactionComplete(transaction);
        return;
      }
      claimed = current.inFlight ?? {
        version: current.version,
        payload: current.payload,
      };
      updated = { ...current, inFlight: claimed, state: "syncing" };
      store.put(updated);
      await transactionComplete(transaction);
    },
    () => {
      const current = memoryAnswers.get(record.key);
      if (!current || current.state === "failed" || current.state === "conflict" || current.state === "confirmed") return;
      claimed = current.inFlight ?? {
        version: current.version,
        payload: current.payload,
      };
      updated = { ...current, inFlight: claimed, state: "syncing" };
      memoryAnswers.set(record.key, updated);
    },
  );
  if (updated) memoryAnswers.set(record.key, updated);
  if (claimed) notifyListeners();
  return claimed;
}

export async function completePendingAnswer(
  record: PendingAnswerRecord,
  sent: PendingAnswerInFlight,
  revision: number,
): Promise<{ confirmed: boolean; hasNewer: boolean }> {
  let result = { confirmed: false, hasNewer: false };
  let updated: PendingAnswerRecord | undefined;
  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(ANSWERS_STORE, "readwrite");
      const store = transaction.objectStore(ANSWERS_STORE);
      const current = await requestResult(store.get(record.key)) as
        | PendingAnswerRecord
        | undefined;
      if (!current || current.inFlight?.version !== sent.version) {
        await transactionComplete(transaction);
        return;
      }
      const hasNewer = current.version !== sent.version;
      updated = hasNewer
        ? {
            ...current,
            payload: {
              ...current.payload,
              RevisionEsperada: revision,
            },
            inFlight: undefined,
            state: "pending",
            lastError: undefined,
            lastErrorCode: undefined,
          }
        : {
            ...current,
            payload: {
              ...current.payload,
              RevisionEsperada: revision,
            },
            inFlight: undefined,
            state: "confirmed",
            lastError: undefined,
            lastErrorCode: undefined,
          };
      store.put(updated);
      result = { confirmed: !hasNewer, hasNewer };
      await transactionComplete(transaction);
    },
    () => {
      const current = memoryAnswers.get(record.key);
      if (!current || current.inFlight?.version !== sent.version) return;
      const hasNewer = current.version !== sent.version;
      updated = {
        ...current,
        payload: { ...current.payload, RevisionEsperada: revision },
        inFlight: undefined,
        state: hasNewer ? "pending" : "confirmed",
        lastError: undefined,
        lastErrorCode: undefined,
      };
      memoryAnswers.set(record.key, updated);
      result = { confirmed: !hasNewer, hasNewer };
    },
  );
  if (updated) memoryAnswers.set(record.key, updated);
  notifyListeners();
  return result;
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
  lastErrorCode?: string,
): Promise<void> {
  const current = await getPendingAnswer(record.idIntento, record.idPregunta);
  if (
    current?.version !== record.version &&
    current?.inFlight?.version !== record.version
  ) return;

  const supersededFailure =
    state === "failed" &&
    current.inFlight !== undefined &&
    current.version !== current.inFlight.version;
  const updated: PendingAnswerRecord = supersededFailure
    ? {
        ...current,
        inFlight: undefined,
        state: "pending",
        attempts: current.attempts + 1,
        lastError: undefined,
        lastErrorCode: undefined,
      }
    : {
        ...current,
        state,
        attempts: current.attempts + 1,
        lastError,
        lastErrorCode,
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

export async function discardPendingAnswer(
  idIntento: number,
  idPregunta: number,
): Promise<void> {
  const key = answerKey(idIntento, idPregunta);
  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(ANSWERS_STORE, "readwrite");
      transaction.objectStore(ANSWERS_STORE).delete(key);
      await transactionComplete(transaction);
    },
    () => memoryAnswers.delete(key),
  );
  memoryAnswers.delete(key);
  notifyListeners();
}

export async function rebasePendingAnswer(
  idIntento: number,
  idPregunta: number,
  revision: number,
): Promise<PendingAnswerRecord | undefined> {
  const current = await getPendingAnswer(idIntento, idPregunta);
  if (!current) return undefined;
  const payload: GuardarRespuestaPayload = {
    ...current.payload,
    RevisionEsperada: revision,
    EventoId: createEventId(),
  };
  const rebased: PendingAnswerRecord = {
    ...current,
    version: createVersion(),
    payload,
    inFlight: undefined,
    state: "pending",
    updatedAt: Date.now(),
    lastError: undefined,
    lastErrorCode: undefined,
  };
  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(ANSWERS_STORE, "readwrite");
      transaction.objectStore(ANSWERS_STORE).put(rebased);
      await transactionComplete(transaction);
    },
    () => memoryAnswers.set(rebased.key, rebased),
  );
  memoryAnswers.set(rebased.key, rebased);
  notifyListeners();
  return rebased;
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
