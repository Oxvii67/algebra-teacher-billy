"use client";

import { useCallback, useState } from "react";
import { ArrowRight, Image as ImageIcon, Keyboard, LoaderCircle, PenTool } from "lucide-react";
import type { SolveInput } from "@/lib/types";
import { DrawCanvas } from "./DrawCanvas";
import { EquationInput } from "./EquationInput";
import { ImageInput } from "./ImageInput";

export type StudioTab = "image" | "draw" | "type";
type Tab = StudioTab;

const TABS: { id: Tab; label: string; icon: typeof ImageIcon }[] = [
  { id: "type", label: "Type", icon: Keyboard },
  { id: "image", label: "Photo", icon: ImageIcon },
  { id: "draw", label: "Handwrite", icon: PenTool },
];

export function StudioInput({
  onSubmit,
  busy,
  submitLabel = "Solve it",
  initialTab = "type",
  initialLatex = "",
}: {
  onSubmit: (input: SolveInput) => void;
  busy?: boolean;
  submitLabel?: string;
  initialTab?: Tab;
  initialLatex?: string;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [image, setImage] = useState<string | null>(null);
  const [drawing, setDrawing] = useState<string | null>(null);
  const [latex, setLatex] = useState(initialLatex);
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
      <div className="tab-track mb-4 flex w-full overflow-x-auto sm:w-auto" role="tablist" aria-label="How to enter the problem">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              type="button"
              onClick={() => setTab(t.id)}
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
