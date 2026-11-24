"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { applyActivity, mergeProfiles, type Activity } from "@/lib/progress";
import {
  EMPTY_PROFILE,
  type Folder,
  type PracticeTest,
  type Profile,
  type SavedSolution,
  type SolveResult,
} from "@/lib/types";
import { setSessionOwner } from "@/lib/session/store";
import { localStore, uid } from "./local";

interface DataCtx {
  ready: boolean;
  user: User | null;
  mode: "guest" | "cloud";
  profile: Profile;
  folders: Folder[];
  solutions: SavedSolution[];
  tests: PracticeTest[];
  notice: string | null;
  clearNotice: () => void;
  saveSolution: (result: SolveResult, folderId?: string | null) => Promise<SavedSolution>;
  deleteSolution: (id: string) => Promise<void>;
  moveSolution: (id: string, folderId: string | null) => Promise<void>;
  createFolder: (name: string) => Promise<Folder>;
  renameFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  saveTest: (t: PracticeTest) => Promise<void>;
  deleteTest: (id: string) => Promise<void>;
  recordActivity: (a: Activity) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<DataCtx | null>(null);

function titleFrom(r: SolveResult): string {
  const s = r.problemSummary || r.topic || "Saved problem";
  return s.length > 90 ? s.slice(0, 87) + "..." : s;
}

async function migrateGuestData(sb: SupabaseClient, userId: string): Promise<number> {
  const folders = localStore.folders();
  const solutions = localStore.solutions();
  const tests = localStore.tests();
  const guestProfile = localStore.profile();

  if (folders.length) {
    const { error } = await sb.from("folders").upsert(folders.map((f) => ({ ...f, user_id: userId })));
    if (error) throw error;
  }
  if (solutions.length) {
    const { error } = await sb.from("solutions").upsert(solutions.map((s) => ({ ...s, user_id: userId })));
    if (error) throw error;
  }
  if (tests.length) {
    const { error } = await sb.from("practice_tests").upsert(tests.map((t) => ({ ...t, user_id: userId })));
    if (error) throw error;
  }
  if (guestProfile.xp > 0 || Object.keys(guestProfile.skill_mastery).length) {
    const { data } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
    const merged = mergeProfiles((data as Profile | null) ?? EMPTY_PROFILE, guestProfile);
    await sb.from("profiles").upsert({
      id: userId,
      xp: merged.xp,
      level: merged.level,
      streak_days: merged.streak_days,
      last_active_date: merged.last_active_date,
      skill_mastery: merged.skill_mastery,
      updated_at: new Date().toISOString(),
    });
  }
  localStore.clear();
  return folders.length + solutions.length + tests.length;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const sbRef = useRef<SupabaseClient | null>(null);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [solutions, setSolutions] = useState<SavedSolution[]>([]);
  const [tests, setTests] = useState<PracticeTest[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const loadGuest = useCallback(() => {
    setFolders(localStore.folders());
    setSolutions(localStore.solutions());
    setTests(localStore.tests());
    setProfile(localStore.profile());
  }, []);

  const loadCloud = useCallback(async (sb: SupabaseClient, u: User) => {
    const [f, s, t, p] = await Promise.all([
      sb.from("folders").select("id,name,created_at").order("created_at"),
      sb.from("solutions").select("id,folder_id,title,problem_latex,topic,result,created_at").order("created_at", { ascending: false }),
      sb.from("practice_tests").select("id,title,level,questions,responses,score,max_score,created_at").order("created_at", { ascending: false }),
      sb.from("profiles").select("*").eq("id", u.id).maybeSingle(),
    ]);
    setFolders((f.data as Folder[]) ?? []);
    setSolutions((s.data as SavedSolution[]) ?? []);
    setTests((t.data as PracticeTest[]) ?? []);
    setProfile(p.data ? { ...EMPTY_PROFILE, ...(p.data as Profile) } : EMPTY_PROFILE);
  }, []);

  const handleUser = useCallback(
    async (u: User | null) => {
      const sb = sbRef.current;
      setSessionOwner(u?.id ?? null);
      setUser(u);
      if (!u || !sb) {
        loadGuest();
        setReady(true);
        return;
      }
      if (localStore.hasData()) {
        try {
          const n = await migrateGuestData(sb, u.id);
          setNotice(`Your guest work was moved into your account${n ? ` (${n} item${n === 1 ? "" : "s"})` : ""}.`);
        } catch {
          setNotice("Guest work could not be moved yet. It is still saved on this device and will retry on next sign-in.");
        }
      }
      try {
        await loadCloud(sb, u);
      } catch {
        loadGuest();
      }
      setReady(true);
    },
    [loadCloud, loadGuest],
  );

  useEffect(() => {
    const sb = getSupabaseBrowser();
    sbRef.current = sb;
    if (!sb) {
      setSessionOwner(null);
      loadGuest();
      setReady(true);
      return;
    }
    let lastId: string | null | undefined;
    sb.auth.getUser().then(({ data }) => {
      lastId = data.user?.id ?? null;
      handleUser(data.user ?? null);
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      const next = session?.user ?? null;
      if ((next?.id ?? null) === lastId) return;
      lastId = next?.id ?? null;
      handleUser(next);
    });
    return () => sub.subscription.unsubscribe();
  }, [handleUser, loadGuest]);

  const cloud = Boolean(user && sbRef.current);

  const saveSolution = useCallback(
    async (result: SolveResult, folderId: string | null = null) => {
      const row: SavedSolution = {
        id: uid(),
        folder_id: folderId,
        title: titleFrom(result),
        problem_latex: result.problemLatex,
        topic: result.topic,
        result,
        created_at: new Date().toISOString(),
      };
      setSolutions((prev) => {
        const next = [row, ...prev];
        if (!cloud) localStore.setSolutions(next);
        return next;
      });
      if (cloud) await sbRef.current!.from("solutions").insert(row);
      return row;
    },
    [cloud],
  );

  const deleteSolution = useCallback(
    async (id: string) => {
      setSolutions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (!cloud) localStore.setSolutions(next);
        return next;
      });
      if (cloud) await sbRef.current!.from("solutions").delete().eq("id", id);
    },
    [cloud],
  );

  const moveSolution = useCallback(
    async (id: string, folderId: string | null) => {
      setSolutions((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, folder_id: folderId } : s));
        if (!cloud) localStore.setSolutions(next);
        return next;
      });
      if (cloud) await sbRef.current!.from("solutions").update({ folder_id: folderId }).eq("id", id);
    },
    [cloud],
  );

  const createFolder = useCallback(
    async (name: string) => {
      const f: Folder = { id: uid(), name: name.trim().slice(0, 80) || "Untitled", created_at: new Date().toISOString() };
      setFolders((prev) => {
        const next = [...prev, f];
        if (!cloud) localStore.setFolders(next);
        return next;
      });
      if (cloud) await sbRef.current!.from("folders").insert(f);
      return f;
    },
    [cloud],
  );

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      const clean = name.trim().slice(0, 80);
      if (!clean) return;
      setFolders((prev) => {
        const next = prev.map((f) => (f.id === id ? { ...f, name: clean } : f));
        if (!cloud) localStore.setFolders(next);
        return next;
      });
      if (cloud) await sbRef.current!.from("folders").update({ name: clean }).eq("id", id);
    },
    [cloud],
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      setFolders((prev) => {
        const next = prev.filter((f) => f.id !== id);
        if (!cloud) localStore.setFolders(next);
        return next;
      });
      setSolutions((prev) => {
        const next = prev.map((s) => (s.folder_id === id ? { ...s, folder_id: null } : s));
        if (!cloud) localStore.setSolutions(next);
        return next;
      });
      if (cloud) await sbRef.current!.from("folders").delete().eq("id", id);
    },
    [cloud],
  );

  const saveTest = useCallback(
    async (t: PracticeTest) => {
      setTests((prev) => {
        const exists = prev.some((x) => x.id === t.id);
        const next = exists ? prev.map((x) => (x.id === t.id ? t : x)) : [t, ...prev];
        if (!cloud) localStore.setTests(next);
        return next;
      });
      if (cloud) await sbRef.current!.from("practice_tests").upsert(t);
    },
    [cloud],
  );

  const deleteTest = useCallback(
    async (id: string) => {
      setTests((prev) => {
        const next = prev.filter((x) => x.id !== id);
        if (!cloud) localStore.setTests(next);
        return next;
      });
      if (cloud) await sbRef.current!.from("practice_tests").delete().eq("id", id);
    },
    [cloud],
  );

  const recordActivity = useCallback(
    (a: Activity) => {
      const next = applyActivity(profileRef.current, a);
      profileRef.current = next;
      setProfile(next);
      if (cloud && user) {
        void sbRef.current!.from("profiles").upsert({
          id: user.id,
          xp: next.xp,
          level: next.level,
          streak_days: next.streak_days,
          last_active_date: next.last_active_date,
          skill_mastery: next.skill_mastery,
          updated_at: new Date().toISOString(),
        });
      } else {
        localStore.setProfile(next);
      }
    },
    [cloud, user],
  );

  const signOut = useCallback(async () => {
    await sbRef.current?.auth.signOut();
  }, []);

  const value = useMemo<DataCtx>(
    () => ({
      ready,
      user,
      mode: cloud ? "cloud" : "guest",
      profile,
      folders,
      solutions,
      tests,
      notice,
      clearNotice: () => setNotice(null),
      saveSolution,
      deleteSolution,
      moveSolution,
      createFolder,
      renameFolder,
      deleteFolder,
      saveTest,
      deleteTest,
      recordActivity,
      signOut,
    }),
    [ready, user, cloud, profile, folders, solutions, tests, notice, saveSolution, deleteSolution, moveSolution, createFolder, renameFolder, deleteFolder, saveTest, deleteTest, recordActivity, signOut],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useData must be used inside DataProvider");
  return v;
}
