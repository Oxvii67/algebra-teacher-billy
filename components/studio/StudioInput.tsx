"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Image as ImageIcon, Keyboard, LoaderCircle, PenTool } from "lucide-react";
import { loadDraft, saveDraft, type Stroke, type StudioDraft } from "@/lib/session/drafts";
import type { StudioTab } from "@/lib/session/studio";
import type { SolveInput } from "@/lib/types";
import { DrawCanvas } from "./DrawCanvas";
import { EquationInput } from "./EquationInput";
import { ImageInput } from "./ImageInput";

type Tab = StudioTab;

const TABS: { id: Tab; label: string; icon: typeof ImageIcon }[] = [
  { id: "image", label: "Screenshot", icon: ImageIcon },
  { id: "draw", label: "Draw", icon: PenTool },
  { id: "type", label: "Keypad", icon: Keyboard },
];

export function StudioInput({
  onSubmit,
  busy,
  submitLabel = "Solve it",
  tab,
  onTab,
  owner,
  initialLatex = "",
}: {
  onSubmit: (input: SolveInput) => void;
  busy?: boolean;
  submitLabel?: string;
  tab: Tab;
  onTab: (t: Tab) => void;
  /** Whose draft to load and keep; null until sign-in state is known. */
  owner: string | null;
  initialLatex?: string;
}) {
  const [image, setImage] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<string | null>(null);
  const [latex, setLatex] = useState(initialLatex);
  const [note, setNote] = useState("");
  const [strokes, setStrokes] = useState<Stroke[]>([]);

  // Bring back the unfinished problem. A field the student already filled in is left alone.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!owner || owner === loadedFor) return;
    let cancelled = false;
    if (loadedFor) {
      // Someone else signed in or out: their draft, not the last person's.
      setImage(null);
      setStrokes([]);
      setLatex("");
      setNote("");
      setLoadedFor(null);
      return;
    }
    void loadDraft(owner).then((d) => {
      if (cancelled) return;
      if (d) {
        setImage((v) => v ?? d.image);
        setStrokes((v) => (v.length ? v : d.strokes));
        if (!initialLatex) {
          setLatex((v) => v || d.latex);
          setNote((v) => v || d.note);
        }
      }
      setLoadedFor(owner);
    });
    return () => {
      cancelled = true;
    };
  }, [owner, loadedFor, initialLatex]);

  const unsaved = useRef<{ owner: string; draft: StudioDraft } | null>(null);
  const flush = useCallback(() => {
    if (!unsaved.current) return;
    void saveDraft(unsaved.current.owner, unsaved.current.draft);
    unsaved.current = null;
  }, []);
  useEffect(() => {
    if (!loadedFor || loadedFor !== owner) return;
    unsaved.current = { owner: loadedFor, draft: { image, strokes, latex, note } };
    const t = setTimeout(flush, 300);
    return () => clearTimeout(t);
  }, [image, strokes, latex, note, loadedFor, owner, flush]);
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  const onDrawChange = useCallback((v: string | null) => setDrawing(v), []);

  const current: SolveInput | null =
    tab === "image"
      ? image
        ? { kind: "image", dataUrl: image, note: note || undefined }
        : null
      : tab === "draw"
        ? drawing
          ? { kind: "image", dataUrl: drawing, note: note || undefined }
          : null
        : latex.trim()
          ? { kind: "text", latex: latex.trim(), note: note || undefined }
          : null;

  const submit = () => current && !busy && onSubmit(current);

  return (
    <div className="card p-4 md:p-5">
      <div className="tab-track mb-4 flex w-full overflow-x-auto sm:w-auto" role="tablist" aria-label="How to enter the problem">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              type="button"
              onClick={() => onTab(t.id)}
              className={`tab flex-1 justify-center whitespace-nowrap sm:flex-none ${tab === t.id ? "tab-active" : ""}`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      <div hidden={tab !== "image"}>
        <ImageInput value={image} onChange={setImage} active={tab === "image"} />
      </div>
      <div hidden={tab !== "draw"}>
        <DrawCanvas strokes={strokes} setStrokes={setStrokes} onChange={onDrawChange} />
      </div>
      <div hidden={tab !== "type"}>
        <EquationInput value={latex} onChange={setLatex} onSubmit={submit} />
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
        <input
          className="input sm:flex-1"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Instructions, if any: factor completely, solve for y"
          aria-label="Instructions for Billy (optional)"
          maxLength={300}
        />
        <button type="button" className="btn-primary sm:w-auto" disabled={!current || busy} onClick={submit}>
          {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {submitLabel}
          {!busy && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
