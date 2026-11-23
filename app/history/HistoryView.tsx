"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ClipboardList, Folder, FolderOpen, FolderPlus, Inbox, Pencil, Search, Trash2 } from "lucide-react";
import { useData } from "@/lib/data/DataProvider";
import { MathInline } from "@/components/math/Math";

type Filter = { kind: "all" } | { kind: "unfiled" } | { kind: "folder"; id: string } | { kind: "tests" };

export function HistoryView() {
  const { ready, mode, folders, solutions, tests, createFolder, renameFolder, deleteFolder, moveSolution, deleteSolution, deleteTest } = useData();
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [q, setQ] = useState("");
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const shown = useMemo(() => {
    let list = solutions;
    if (filter.kind === "unfiled") list = list.filter((s) => !s.folder_id);
    if (filter.kind === "folder") list = list.filter((s) => s.folder_id === filter.id);
    const needle = q.trim().toLowerCase();
    if (needle) list = list.filter((s) => (s.title + " " + s.topic + " " + s.problem_latex).toLowerCase().includes(needle));
    return list;
  }, [solutions, filter, q]);

  const count = (id: string) => solutions.filter((s) => s.folder_id === id).length;
  const sel = (f: Filter) => JSON.stringify(f) === JSON.stringify(filter);
  const item = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${active ? "bg-accent text-accent-fg" : "hover:bg-surface-2"}`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold">History and Folders</h1>
          <p className="mt-1 text-sm text-muted">
            {mode === "cloud" ? "Synced to your account." : "Saved on this device. Sign in to sync across devices."}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input className="input pl-9" placeholder="Search saved problems" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="card h-fit space-y-1 p-2">
          <button className={item(sel({ kind: "all" }))} onClick={() => setFilter({ kind: "all" })}>
            <FolderOpen className="h-4 w-4" /> All problems <span className="ml-auto text-xs opacity-70">{solutions.length}</span>
          </button>
          <button className={item(sel({ kind: "unfiled" }))} onClick={() => setFilter({ kind: "unfiled" })}>
            <Inbox className="h-4 w-4" /> Unfiled
            <span className="ml-auto text-xs opacity-70">{solutions.filter((s) => !s.folder_id).length}</span>
          </button>
          <button className={item(sel({ kind: "tests" }))} onClick={() => setFilter({ kind: "tests" })}>
            <ClipboardList className="h-4 w-4" /> Practice tests <span className="ml-auto text-xs opacity-70">{tests.length}</span>
          </button>
          <div className="px-3 pb-1 pt-3 label">Folders</div>
          {folders.map((f) =>
            editing === f.id ? (
              <form
                key={f.id}
                className="flex gap-1 px-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  renameFolder(f.id, editName);
                  setEditing(null);
                }}
              >
                <input className="input py-1" autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} onBlur={() => setEditing(null)} />
              </form>
            ) : (
              <div key={f.id} className="group flex items-center">
                <button className={item(sel({ kind: "folder", id: f.id }))} onClick={() => setFilter({ kind: "folder", id: f.id })}>
                  <Folder className="h-4 w-4 shrink-0" />
                  <span className="truncate">{f.name}</span>
                  <span className="ml-auto text-xs opacity-70">{count(f.id)}</span>
                </button>
                <button
                  className="hidden p-1 text-muted hover:text-text group-hover:block"
                  aria-label={`Rename ${f.name}`}
                  onClick={() => {
                    setEditing(f.id);
                    setEditName(f.name);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="hidden p-1 text-muted hover:text-danger group-hover:block"
                  aria-label={`Delete ${f.name}`}
                  onClick={() => {
                    if (confirm(`Delete folder "${f.name}"? Problems inside move to Unfiled.`)) {
                      deleteFolder(f.id);
                      if (sel({ kind: "folder", id: f.id })) setFilter({ kind: "all" });
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          )}
          <form
            className="flex gap-1 p-1"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newName.trim()) return;
              const f = await createFolder(newName);
              setNewName("");
              setFilter({ kind: "folder", id: f.id });
            }}
          >
            <input className="input py-1.5" placeholder="New folder" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button type="submit" className="btn-ghost btn-sm" aria-label="Create folder">
              <FolderPlus className="h-4 w-4" />
            </button>
          </form>
        </aside>

        <section className="space-y-3">
          {!ready && <p className="text-sm text-muted">Loading your work.</p>}

          {filter.kind === "tests" ? (
            tests.length === 0 ? (
              <Empty text="No practice tests yet." href="/practice-test" cta="Build a practice test" />
            ) : (
              tests.map((t) => (
                <div key={t.id} className="card flex items-center gap-3 p-4">
                  <ClipboardList className="h-5 w-5 shrink-0 text-accent" />
                  <Link href={`/practice-test?id=${t.id}`} className="min-w-0 flex-1">
                    <div className="truncate font-medium">{t.title}</div>
                    <div className="text-xs text-muted">
                      {t.level.toUpperCase()} level, {t.questions.length} questions
                      {t.score !== null ? `, scored ${t.score}/${t.max_score}` : ", not graded"} - {new Date(t.created_at).toLocaleDateString()}
                    </div>
                  </Link>
                  <button className="p-1.5 text-muted hover:text-danger" aria-label="Delete test" onClick={() => confirm("Delete this test?") && deleteTest(t.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )
          ) : shown.length === 0 && ready ? (
            <Empty text={q ? "No saved problems match that search." : "Nothing saved here yet."} href="/studio" cta="Solve a problem" />
          ) : (
            shown.map((s) => (
              <div key={s.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <Link href={`/history/view?id=${s.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-medium">{s.title}</div>
                  <div className="mt-1 max-w-full overflow-hidden text-sm text-muted">
                    <MathInline latex={s.problem_latex.length > 140 ? s.problem_latex.slice(0, 140) : s.problem_latex} />
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    {s.topic} - {new Date(s.created_at).toLocaleString()}
                  </div>
                </Link>
                <div className="flex items-center gap-2">
                  <select
                    className="input w-40 py-1.5"
                    value={s.folder_id ?? ""}
                    onChange={(e) => moveSolution(s.id, e.target.value || null)}
                    aria-label="Move to folder"
                  >
                    <option value="">Unfiled</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <button className="p-1.5 text-muted hover:text-danger" aria-label="Delete" onClick={() => confirm("Delete this saved problem?") && deleteSolution(s.id)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function Empty({ text, href, cta }: { text: string; href: string; cta: string }) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <p className="text-muted">{text}</p>
      <Link href={href} className="btn-primary">
        {cta}
      </Link>
    </div>
  );
}
