"use client";

import { useCallback, useState } from "react";
import { Image as ImageIcon, Keyboard, LoaderCircle, PenTool, Sparkles } from "lucide-react";
import type { SolveInput } from "@/lib/types";
import { DrawCanvas } from "./DrawCanvas";
import { EquationInput } from "./EquationInput";
import { ImageInput } from "./ImageInput";

type Tab = "image" | "draw" | "type";

const TABS: { id: Tab; label: string; icon: typeof ImageIcon }[] = [
  { id: "image", label: "Photo or Screenshot", icon: ImageIcon },
  { id: "draw", label: "Draw", icon: PenTool },
  { id: "type", label: "Type", icon: Keyboard },
];

export function StudioInput({ onSubmit, busy, submitLabel = "Solve and verify" }: { onSubmit: (input: SolveInput) => void; busy?: boolean; submitLabel?: string }) {
  const [tab, setTab] = useState<Tab>("image");
  const [image, setImage] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<string | null>(null);
  const [latex, setLatex] = useState("");
  const [note, setNote] = useState("");

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
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-surface-2 p-1" role="tablist">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`tab flex-1 justify-center whitespace-nowrap ${tab === t.id ? "tab-active" : ""}`}
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
        <DrawCanvas onChange={onDrawChange} />
      </div>
      <div hidden={tab !== "type"}>
        <EquationInput value={latex} onChange={setLatex} onSubmit={submit} />
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
        <input
          className="input sm:flex-1"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional instruction: solve for x, factor completely, find all real zeros"
          maxLength={300}
        />
        <button type="button" className="btn-primary sm:w-auto" disabled={!current || busy} onClick={submit}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {submitLabel}
        </button>
      </div>
    </div>
  );
}
