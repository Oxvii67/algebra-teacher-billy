"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";

interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

const PROBLEMS: Record<string, string> = {
  "not-allowed": "The microphone is blocked. Allow it in your browser's site settings, or type instead.",
  "service-not-allowed": "Voice typing is turned off in this browser. Type instead.",
  "audio-capture": "No microphone was found. Type instead.",
  network: "Voice typing needs a connection. Check yours, or type instead.",
};

/** Voice typing through the browser's own speech recognition. Renders nothing where it is unsupported. */
export function DictateButton({ onText, onProblem, disabled }: { onText: (t: string) => void; onProblem: (m: string | null) => void; disabled?: boolean }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(!!recognitionCtor());
    return () => {
      const r = rec.current;
      if (r) {
        r.onresult = r.onerror = r.onend = null;
        r.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (disabled) rec.current?.stop();
  }, [disabled]);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i].isFinal ? e.results[i][0].transcript.trim() : "";
        if (t) onText(t);
      }
    };
    r.onerror = (e) => {
      if (PROBLEMS[e.error]) onProblem(PROBLEMS[e.error]);
    };
    r.onend = () => {
      setListening(false);
      rec.current = null;
    };
    onProblem(null);
    try {
      r.start();
      rec.current = r;
      setListening(true);
    } catch {
      onProblem("Voice typing could not start. Type instead.");
    }
  };

  return (
    <button type="button" className="btn-ghost btn-sm" aria-pressed={listening} disabled={disabled} onClick={toggle}>
      {listening ? <Square className="h-3.5 w-3.5 text-danger" /> : <Mic className="h-3.5 w-3.5" />}
      {listening ? "Stop listening" : "Speak"}
    </button>
  );
}
