import type {
  EventoTemporalPayload,
  TipoEventoTelemetria,
} from "@/types";

export type TelemetryOutboxState = "pending" | "synced" | "failed";

export interface TelemetryOutboxRecord {
  key: string;
  version: string;
  idIntento: number;
  eventoId: string;
  payload: EventoTemporalPayload;
  state: TelemetryOutboxState;
  createdAt: number;
  updatedAt: number;
  attempts: number;
  lastError?: string;
}

interface TelemetrySessionRecord {
  idIntento: number;
  sesionClienteId: string;
  nextSequence: number;
}

export interface NewTelemetryEvent {
  Tipo: TipoEventoTelemetria;
  IdIntentoPregunta?: number | null;
  FechaInicioCliente: string;
  FechaFinCliente?: string;
  DuracionMilisegundos?: number;
  Codigo?: string | null;
}

const DATABASE_NAME = "examio-temporal-telemetry-outbox";
const DATABASE_VERSION = 1;
const EVENTS_STORE = "events";
const SESSIONS_STORE = "sessions";
const memoryEvents = new Map<string, TelemetryOutboxRecord>();
const memorySessions = new Map<number, TelemetrySessionRecord>();
const listeners = new Set<() => void>();
let databasePromise: Promise<IDBDatabase> | null = null;
let durableStorageAvailable = true;

const recordKey = (idIntento: number, eventoId: string) =>
  `${idIntento}:${eventoId}`;

const createUuid = () =>
  globalThis.crypto?.randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

const createVersion = () => createUuid();
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
      if (!database.objectStoreNames.contains(EVENTS_STORE)) {
        const store = database.createObjectStore(EVENTS_STORE, { keyPath: "key" });
        store.createIndex("idIntento", "idIntento");
      }
      if (!database.objectStoreNames.contains(SESSIONS_STORE)) {
        database.createObjectStore(SESSIONS_STORE, { keyPath: "idIntento" });
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

async function allocateSession(idIntento: number): Promise<TelemetrySessionRecord> {
  const session = memorySessions.get(idIntento) ?? {
    idIntento,
    sesionClienteId: createUuid(),
    nextSequence: 0,
  };
  return withDurableStorage(
    (database) => new Promise<TelemetrySessionRecord>((resolve, reject) => {
      const transaction = database.transaction(SESSIONS_STORE, "readwrite");
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.get(idIntento);
      let allocated = session;
      request.onsuccess = () => {
        allocated = (request.result as TelemetrySessionRecord | undefined) ?? session;
        store.put({ ...allocated, nextSequence: allocated.nextSequence + 1 });
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => {
        memorySessions.set(idIntento, {
          ...allocated,
          nextSequence: allocated.nextSequence + 1,
        });
        resolve(allocated);
      };
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    }),
    () => {
      memorySessions.set(idIntento, {
        ...session,
        nextSequence: session.nextSequence + 1,
      });
      return session;
    },
  );
}

export async function enqueueTelemetryEvent(
  idIntento: number,
  input: NewTelemetryEvent,
  eventoId = createUuid(),
): Promise<TelemetryOutboxRecord> {
  const key = recordKey(idIntento, eventoId);
  const known = memoryEvents.get(key);
  if (known) return known;
  const existing = await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(EVENTS_STORE, "readonly");
      return requestResult(transaction.objectStore(EVENTS_STORE).get(key)) as
        Promise<TelemetryOutboxRecord | undefined>;
    },
    () => memoryEvents.get(key),
  );
  if (existing) {
    memoryEvents.set(key, existing);
    return existing;
  }
  const session = await allocateSession(idIntento);
  const now = Date.now();
  const record: TelemetryOutboxRecord = {
    key,
    version: createVersion(),
    idIntento,
    eventoId,
    payload: {
      ...input,
      SesionClienteId: session.sesionClienteId,
      SecuenciaCliente: session.nextSequence,
      VersionContrato: 1,
    },
    state: "pending",
    createdAt: now,
    updatedAt: now,
    attempts: 0,
  };
  await persistRecord(record);
  memoryEvents.set(record.key, record);
  notify();
  return record;
}

export async function listTelemetryEvents(
  idIntento: number,
): Promise<TelemetryOutboxRecord[]> {
  return withDurableStorage(
    async (database) => {
      const transaction = database.transaction(EVENTS_STORE, "readonly");
      const records = await requestResult(
        transaction.objectStore(EVENTS_STORE).index("idIntento").getAll(idIntento),
      ) as TelemetryOutboxRecord[];
      records.forEach((record) => memoryEvents.set(record.key, record));
      return records.sort((left, right) =>
        left.payload.SecuenciaCliente - right.payload.SecuenciaCliente
      );
    },
    () => [...memoryEvents.values()]
      .filter((record) => record.idIntento === idIntento)
      .sort((left, right) =>
        left.payload.SecuenciaCliente - right.payload.SecuenciaCliente
      ),
  );
}

export async function completeTelemetryEvent(
  record: TelemetryOutboxRecord,
  fechaFinCliente: string,
  duracionMilisegundos: number,
): Promise<TelemetryOutboxRecord | undefined> {
  const current = (await listTelemetryEvents(record.idIntento))
    .find((candidate) => candidate.key === record.key);
  if (!current || current.state === "failed") return undefined;
  const completed: TelemetryOutboxRecord = {
    ...current,
    version: createVersion(),
    payload: {
      ...current.payload,
      FechaFinCliente: fechaFinCliente,
      DuracionMilisegundos: duracionMilisegundos,
    },
    state: "pending",
    updatedAt: Date.now(),
    lastError: undefined,
  };
  await persistRecord(completed);
  notify();
  return completed;
}

async function persistRecord(record: TelemetryOutboxRecord): Promise<void> {
  await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(EVENTS_STORE, "readwrite");
      transaction.objectStore(EVENTS_STORE).put(record);
      await transactionComplete(transaction);
    },
    () => memoryEvents.set(record.key, record),
  );
  memoryEvents.set(record.key, record);
}

export async function acknowledgeTelemetryEvent(
  record: TelemetryOutboxRecord,
): Promise<boolean> {
  const keepOpen = record.payload.FechaFinCliente === undefined && [
    "question_active",
    "focus_lost",
    "fullscreen_exit",
    "connectivity_lost",
    "auth_session_unavailable",
  ].includes(record.payload.Tipo);

  if (keepOpen) {
    const current = (await listTelemetryEvents(record.idIntento))
      .find((candidate) => candidate.key === record.key);
    if (current?.version !== record.version) return false;
    await persistRecord({ ...current, state: "synced", attempts: current.attempts + 1 });
    notify();
    return true;
  }

  const removed = await withDurableStorage(
    async (database) => {
      const transaction = database.transaction(EVENTS_STORE, "readwrite");
      const store = transaction.objectStore(EVENTS_STORE);
      const current = await requestResult(store.get(record.key)) as
        | TelemetryOutboxRecord
        | undefined;
      if (current?.version !== record.version) {
        transaction.abort();
        return false;
      }
      store.delete(record.key);
      await transactionComplete(transaction);
      return true;
    },
    () => memoryEvents.get(record.key)?.version === record.version,
  );
  if (removed && memoryEvents.get(record.key)?.version === record.version) {
    memoryEvents.delete(record.key);
    notify();
  }
  return removed;
}

export async function failTelemetryEvent(
  record: TelemetryOutboxRecord,
  lastError: string,
): Promise<void> {
  const current = (await listTelemetryEvents(record.idIntento))
    .find((candidate) => candidate.key === record.key);
  if (current?.version !== record.version) return;
  await persistRecord({
    ...current,
    version: createVersion(),
    state: "failed",
    attempts: current.attempts + 1,
    updatedAt: Date.now(),
    lastError,
  });
  notify();
}

export function subscribeTelemetryOutbox(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isTelemetryOutboxDurable(): boolean {
  return durableStorageAvailable;
}

export function createTelemetryEventId(): string {
  return createUuid();
}
