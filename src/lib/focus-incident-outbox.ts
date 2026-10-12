import type { IncidenteFocoPayload } from "@/types";

export type FocusIncidentState = "pending" | "failed";

export interface PendingFocusIncident {
  key: string;
  version: string;
  idIntento: number;
  eventoId: string;
  payload: IncidenteFocoPayload;
  state: FocusIncidentState;
  updatedAt: number;
  attempts: number;
  lastError?: string;
}

const DATABASE_NAME = "examio-focus-incident-outbox";
const DATABASE_VERSION = 1;
const STORE = "incidents";
const memoryIncidents = new Map<string, PendingFocusIncident>();
let databasePromise: Promise<IDBDatabase> | null = null;
let durableStorageAvailable = true;

const recordKey = (idIntento: number, eventoId: string) =>
  `${idIntento}:${eventoId}`;

const createVersion = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
        const store = database.createObjectStore(STORE, { keyPath: "key" });
        store.createIndex("idIntento", "idIntento");
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

export async function saveFocusIncident(
  idIntento: number,
  eventoId: string,
  payload: IncidenteFocoPayload,
): Promise<PendingFocusIncident> {
  const key = recordKey(idIntento, eventoId);
  const previous = memoryIncidents.get(key);
  const record: PendingFocusIncident = {
    key,
    version: createVersion(),
    idIntento,
    eventoId,
    payload,
    state: "pending",
    updatedAt: Date.now(),
    attempts: previous?.attempts ?? 0,
  };
  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(record);
      await transactionComplete(transaction);
    },
    () => {
      memoryIncidents.set(key, record);
    },
  );
  memoryIncidents.set(key, record);
  return record;
}

export async function listFocusIncidents(
  idIntento: number,
): Promise<PendingFocusIncident[]> {
  return withDurableStorage(
    async (database) => {
      const transaction = database.transaction(STORE, "readonly");
      const records = await requestResult(
        transaction.objectStore(STORE).index("idIntento").getAll(idIntento),
      ) as PendingFocusIncident[];
      records.forEach((record) => memoryIncidents.set(record.key, record));
      return records.sort((left, right) => left.updatedAt - right.updatedAt);
    },
    () => [...memoryIncidents.values()]
      .filter((record) => record.idIntento === idIntento)
      .sort((left, right) => left.updatedAt - right.updatedAt),
  );
}

export async function removeFocusIncident(
  record: Pick<PendingFocusIncident, "key" | "version">,
): Promise<boolean> {
  const removed = await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(STORE, "readwrite");
      const store = transaction.objectStore(STORE);
      const current = await requestResult(store.get(record.key)) as
        | PendingFocusIncident
        | undefined;
      if (current?.version !== record.version) {
        transaction.abort();
        return false;
      }
      store.delete(record.key);
      await transactionComplete(transaction);
      return true;
    },
    () => memoryIncidents.get(record.key)?.version === record.version,
  );
  if (removed && memoryIncidents.get(record.key)?.version === record.version) {
    memoryIncidents.delete(record.key);
  }
  return removed;
}

export async function failFocusIncident(
  record: PendingFocusIncident,
  lastError: string,
): Promise<void> {
  const records = await listFocusIncidents(record.idIntento);
  const current = records.find((candidate) => candidate.key === record.key);
  if (current?.version !== record.version) return;
  const failed = {
    ...current,
    state: "failed" as const,
    attempts: current.attempts + 1,
    lastError,
  };
  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(STORE, "readwrite");
      transaction.objectStore(STORE).put(failed);
      await transactionComplete(transaction);
    },
    () => {
      memoryIncidents.set(failed.key, failed);
    },
  );
  memoryIncidents.set(failed.key, failed);
}

export function isFocusOutboxDurable(): boolean {
  return durableStorageAvailable;
}
