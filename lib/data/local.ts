"use client";

import { EMPTY_PROFILE, type Folder, type PracticeTest, type Profile, type SavedSolution } from "@/lib/types";

const K = {
  folders: "atai.guest.folders",
  solutions: "atai.guest.solutions",
  tests: "atai.guest.tests",
  profile: "atai.guest.profile",
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded or unavailable */
  }
}

export const localStore = {
  folders: () => read<Folder[]>(K.folders, []),
  setFolders: (v: Folder[]) => write(K.folders, v),
  solutions: () => read<SavedSolution[]>(K.solutions, []),
  setSolutions: (v: SavedSolution[]) => write(K.solutions, v),
  tests: () => read<PracticeTest[]>(K.tests, []),
  setTests: (v: PracticeTest[]) => write(K.tests, v),
  profile: () => read<Profile>(K.profile, EMPTY_PROFILE),
  setProfile: (v: Profile) => write(K.profile, v),
  hasData(): boolean {
    const p = this.profile();
    return this.folders().length > 0 || this.solutions().length > 0 || this.tests().length > 0 || p.xp > 0;
  },
  clear() {
    Object.values(K).forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        /* ignore */
      }
    });
  },
};

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
