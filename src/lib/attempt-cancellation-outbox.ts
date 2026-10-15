import type { TipoIncidenteSeguridad } from "@/types";

export type AttemptCancellationState = "pending" | "failed";

export interface PendingAttemptCancellation {
  key: string;
  version: string;
  idIntento: number;
  eventoId: string;
  tipoIncidente: TipoIncidenteSeguridad;
  state: AttemptCancellationState;
  createdAt: number;
  updatedAt: number;
  attempts: number;
  lastError?: string;
}

const DATABASE_NAME = "examio-attempt-cancellation-outbox";
const DATABASE_VERSION = 1;
const STORE = "cancellations";
const memoryRecords = new Map<string, PendingAttemptCancellation>();
const listeners = new Set<() => void>();
let databasePromise: Promise<IDBDatabase> | null = null;
let durableStorageAvailable = true;

const recordKey = (idIntento: number) => String(idIntento);
const createVersion = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const notify = () => listeners.forEach((listener) => listener());

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
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE, { keyPath: "key" });
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

export async function getAttemptCancellation(
  idIntento: number,
): Promise<PendingAttemptCancellation | undefined> {
  const key = recordKey(idIntento);
  return withDurableStorage(
    async (database) => {
      const transaction = database.transaction(STORE, "readonly");
      const record = await requestResult(
        transaction.objectStore(STORE).get(key),
      ) as PendingAttemptCancellation | undefined;
      if (record) memoryRecords.set(key, record);
      return record;
    },
    () => memoryRecords.get(key),
  );
}

export async function enqueueAttemptCancellation(
  idIntento: number,
  eventoId: string,
  tipoIncidente: TipoIncidenteSeguridad,
): Promise<PendingAttemptCancellation> {
  const existing = await getAttemptCancellation(idIntento);
  if (existing) return existing;

  const now = Date.now();
  const record: PendingAttemptCancellation = {
    key: recordKey(idIntento),
    version: createVersion(),
    idIntento,
    eventoId,
    tipoIncidente,
    state: "pending",
    createdAt: now,
    updatedAt: now,
    attempts: 0,
  };
  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(record);
      await transactionComplete(transaction);
    },
    () => memoryRecords.set(record.key, record),
  );
  memoryRecords.set(record.key, record);
  notify();
  return record;
}

export async function removeAttemptCancellation(
  record: Pick<PendingAttemptCancellation, "key" | "version">,
): Promise<boolean> {
  const removed = await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      const current = await requestResult(store.get(record.key)) as
        | PendingAttemptCancellation
        | undefined;
      if (current?.version !== record.version) {
        transaction.abort();
        return false;
      }
      store.delete(record.key);
      await transactionComplete(transaction);
      return true;
    },
    () => memoryRecords.get(record.key)?.version === record.version,
  );
  if (removed && memoryRecords.get(record.key)?.version === record.version) {
    memoryRecords.delete(record.key);
  }
  if (removed) notify();
  return removed;
}

export async function failAttemptCancellation(
  record: PendingAttemptCancellation,
  lastError: string,
): Promise<void> {
  const current = await getAttemptCancellation(record.idIntento);
  if (current?.version !== record.version) return;
  const failed: PendingAttemptCancellation = {
    ...current,
    version: createVersion(),
    state: "failed",
    updatedAt: Date.now(),
    attempts: current.attempts + 1,
    lastError,
  };
  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(failed);
      await transactionComplete(transaction);
    },
    () => memoryRecords.set(failed.key, failed),
  );
  memoryRecords.set(failed.key, failed);
  notify();
}

export function subscribeAttemptCancellation(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isAttemptCancellationOutboxDurable(): boolean {
  return durableStorageAvailable;
}
