"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ClipboardPaste, Crop, Upload, X } from "lucide-react";
import { CropEditor } from "./CropEditor";
import { fileToDataUrl, shrinkImage } from "./imageUtils";

export function ImageInput({
  value,
  onChange,
  active,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  /** Only listen for clipboard paste while this tab is visible. */
  active: boolean;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [camOpen, setCamOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const accept = useCallback(async (blob: Blob) => {
    if (!blob.type.startsWith("image/")) {
      setError("That file is not an image. Use PNG, JPG, HEIC exported as JPG, or a screenshot.");
      return;
    }
    setError(null);
    const url = await fileToDataUrl(blob);
    setRaw(await shrinkImage(url, 2400));
  }, []);

  useEffect(() => {
    if (!active) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (file) {
        e.preventDefault();
        void accept(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [active, accept]);

  const readClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith("image/"));
        if (type) return void accept(await it.getType(type));
      }
      setError("The clipboard has no image. Take a screenshot first, then paste.");
    } catch {
      setError("Clipboard access was blocked. Press Ctrl+V or Cmd+V on this page instead.");
    }
  };

  if (raw) {
    return (
      <CropEditor
        src={raw}
        onCancel={() => setRaw(null)}
        onDone={(url) => {
          onChange(url);
          setRaw(null);
        }}
      />
    );
  }

  if (camOpen) {
    return (
      <Webcam
        onClose={() => setCamOpen(false)}
        onCapture={(url) => {
          setCamOpen(false);
          setRaw(url);
        }}
      />
    );
  }

  if (value) {
    return (
      <div className="space-y-3">
        <div className="flex justify-center rounded-lg bg-surface-2 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Cropped problem" className="max-h-[50vh] max-w-full rounded border border-line bg-white" />
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-ghost" onClick={() => setRaw(value)}>
            <Crop className="h-4 w-4" /> Recrop
          </button>
          <button type="button" className="btn-ghost" onClick={() => onChange(null)}>
            <X className="h-4 w-4" /> Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void accept(f);
        }}
        onClick={() => fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-accent bg-accent/10" : "border-line hover:bg-surface-2"
        }`}
      >
        <Upload className="h-8 w-8 text-accent" />
        <div>
          <p className="font-medium">Drop a photo or screenshot of the problem</p>
          <p className="mt-1 text-sm text-muted">or click to choose a file. Paste with Ctrl+V or Cmd+V anywhere on this page.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void accept(f);
            e.target.value = "";
          }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-ghost" onClick={() => setCamOpen(true)}>
          <Camera className="h-4 w-4" /> Use webcam
        </button>
        <button type="button" className="btn-ghost" onClick={readClipboard}>
          <ClipboardPaste className="h-4 w-4" /> Paste from clipboard
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function Webcam({ onCapture, onClose }: { onCapture: (url: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        setError("Camera access was denied or no camera is available.");
      }
    })();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  const snap = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    onCapture(c.toDataURL("image/jpeg", 0.92));
  };

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl bg-black">
        {error ? (
          <p className="p-10 text-center text-sm text-white">{error}</p>
        ) : (
          <video ref={videoRef} playsInline muted className="mx-auto max-h-[60vh] w-full object-contain" />
        )}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))}>
          Switch camera
        </button>
        <button type="button" className="btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="btn-primary" onClick={snap} disabled={!!error}>
          <Camera className="h-4 w-4" /> Capture
        </button>
      </div>
    </div>
  );
}
