"use client";

import { useSyncExternalStore } from "react";

/**
 * Work in progress that survives leaving a page, closing the tab, or a reload. Each store is one
 * value per owner (a signed-in user, or "guest") in this browser, so accounts that share a computer
 * never see each other's work. Values live at module level, so a reply that arrives after the
 * student has left the page is still kept.
 */

export type Owner = string;
const GUEST: Owner = "guest";
const PREFIX = "atai.session";
const SAVE_DELAY_MS = 200;

/** Null until sign-in state is known; nothing is read or written before then. */
let owner: Owner | null = null;
const ownerListeners = new Set<() => void>();

export function currentOwner(): Owner | null {
  return owner;
}

export function setSessionOwner(userId: string | null) {
  const next = userId ?? GUEST;
  if (owner === next) return;
  ownerListeners.forEach((f) => f());
  owner = next;
  ownerListeners.forEach((f) => f());
}

export interface Store<T> {
  initial: T;
  get: () => T;
  /** Pass the owner captured before an await, so a late reply never lands in another person's work. */
  set: (update: (prev: T) => T, forOwner?: Owner | null) => void;
  subscribe: (fn: () => void) => () => void;
}

export interface SessionOptions<T> {
  name: string;
  initial: T;
  /** Turns stored data of any shape into a usable value. */
  revive: (raw: unknown) => T;
  /** Guest work joins the account it signs in to. By default the guest work, being newest, is shown. */
  merge?: (account: T, guest: T) => T;
  /** A smaller value to keep when the browser is out of space. */
  trim?: (v: T) => T;
}

export function createSession<T>({ name, initial, revive, merge, trim }: SessionOptions<T>): Store<T> {
  const key = (o: Owner) => `${PREFIX}.${name}.${o}`;
  const subs = new Set<() => void>();
  const emit = () => subs.forEach((f) => f());
  let value = initial;
  let loadedFor: Owner | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const read = (o: Owner): T | null => {
    try {
      const raw = localStorage.getItem(key(o));
      return raw === null ? null : revive(JSON.parse(raw));
    } catch {
      return null;
    }
  };

  const write = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    if (loadedFor === null) return false;
    const save = (v: T) => localStorage.setItem(key(loadedFor!), JSON.stringify(v));
    try {
      save(value);
      return true;
    } catch {
      try {
        if (trim) save(trim(value));
        return !!trim;
      } catch {
        return false; // storage is full or blocked; the work still lasts until the tab closes
      }
    }
  };
  const flush = () => {
    if (timer) write();
  };

  const load = () => {
    if (owner === null || loadedFor === owner) return;
    flush();
    loadedFor = owner;
    const own = read(owner);
    value = own ?? initial;
    if (owner === GUEST) return;
    const guest = read(GUEST);
    if (guest === null) return;
    value = own && merge ? merge(own, guest) : guest;
    if (write()) localStorage.removeItem(key(GUEST));
  };

  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush());
    // Another tab saved: take its version, so this tab does not overwrite it with an older one.
    window.addEventListener("storage", (e) => {
      if (loadedFor === null || loadedFor !== owner || timer || e.key !== key(loadedFor)) return;
      value = read(loadedFor) ?? initial;
      emit();
    });
    ownerListeners.add(() => {
      flush();
      emit();
    });
  }

  return {
    initial,
    get: () => {
      load();
      return value;
    },
    set: (update, forOwner) => {
      if (owner === null || (forOwner !== undefined && forOwner !== owner)) return;
      load();
      const next = update(value);
      if (next === value) return;
      value = next;
      if (timer) clearTimeout(timer);
      timer = setTimeout(write, SAVE_DELAY_MS);
      emit();
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

/** Shared state that lasts until the tab closes: what is loading, and what went wrong. */
export function createLive<T>(initial: T): Store<T> {
  const subs = new Set<() => void>();
  let value = initial;
  return {
    initial,
    get: () => value,
    set: (update) => {
      value = update(value);
      subs.forEach((f) => f());
    },
    subscribe: (fn) => {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}

export function useStore<T>(s: Store<T>): T {
  return useSyncExternalStore(s.subscribe, s.get, () => s.initial);
}

export function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
