"use client";

/**
 * Photos and drawings are too big for localStorage (they would crowd out saved problems), so the
 * unsolved problem on the Solve page is kept in IndexedDB. Every call resolves even when the
 * browser blocks storage; the draft then lasts only as long as the page.
 */

export interface Stroke {
  points: [number, number, number][];
  color: string;
  size: number;
  erase: boolean;
}

export interface StudioDraft {
  image: string | null;
  strokes: Stroke[];
  latex: string;
  note: string;
}

const DB = "atai";
const STORE = "drafts";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  try {
    const db = await open();
    try {
      return await new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = tx.onabort = () => reject(tx.error);
      });
    } finally {
      db.close();
    }
  } catch {
    return null;
  }
}

function keyFor(owner: string) {
  return `studio.${owner}`;
}

export async function loadDraft(owner: string): Promise<StudioDraft | null> {
  const own = (await run("readonly", (s) => s.get(keyFor(owner)))) as StudioDraft | undefined | null;
  if (owner === "guest") return own ?? null;
  // A problem started before signing in follows the student into the account.
  const guest = (await run("readonly", (s) => s.get(keyFor("guest")))) as StudioDraft | undefined | null;
  if (!guest) return own ?? null;
  await run("readwrite", (s) => s.put(guest, keyFor(owner)));
  await run("readwrite", (s) => s.delete(keyFor("guest")));
  return guest;
}

export async function saveDraft(owner: string, draft: StudioDraft): Promise<void> {
  const empty = !draft.image && !draft.strokes.length && !draft.latex.trim() && !draft.note.trim();
  if (empty) await run("readwrite", (s) => s.delete(keyFor(owner)));
  else await run("readwrite", (s) => s.put(draft, keyFor(owner)));
}
