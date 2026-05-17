// Tiny IndexedDB sync queue. Phase 2 — used by the match reporter and gate
// scanner to buffer writes while offline. Each item is JSON-serialisable and
// has a stable client_id; the server-side action uses upsert on (parent_id,
// client_id) so retries are idempotent.

const DB_NAME = "sporlo-offline";
const DB_VERSION = 1;
const STORE = "queue";

export interface QueuedItem<T = unknown> {
  /** Stable client-generated id; server upserts on this. */
  id: string;
  /** Logical channel — e.g. "match-events" or "gate-scans". */
  channel: string;
  payload: T;
  enqueued_at: number;
}

function isAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

async function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("channel", "channel", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueue<T>(item: QueuedItem<T>): Promise<void> {
  if (!isAvailable()) return;
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function list<T = unknown>(channel: string): Promise<QueuedItem<T>[]> {
  if (!isAvailable()) return [];
  const db = await open();
  const items = await new Promise<QueuedItem<T>[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const idx = tx.objectStore(STORE).index("channel");
    const req = idx.getAll(channel);
    req.onsuccess = () => resolve((req.result as QueuedItem<T>[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return items.sort((a, b) => a.enqueued_at - b.enqueued_at);
}

export async function remove(id: string): Promise<void> {
  if (!isAvailable()) return;
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function size(channel: string): Promise<number> {
  return (await list(channel)).length;
}

// Flush a channel through a sender function. Returns the number of items
// successfully sent. Items that fail stay in the queue for next time.
export async function flush<T>(
  channel: string,
  send: (item: QueuedItem<T>) => Promise<boolean>,
): Promise<number> {
  const items = await list<T>(channel);
  let ok = 0;
  for (const item of items) {
    try {
      const sent = await send(item);
      if (sent) {
        await remove(item.id);
        ok++;
      }
    } catch {
      // Stop on first failure — usually means we went offline again.
      break;
    }
  }
  return ok;
}
