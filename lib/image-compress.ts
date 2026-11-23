/**
 * Client-side image compression for uploads, pastes, drawings, and camera captures.
 * Every image is flattened onto white (so transparent drawings stay readable as JPEG), scaled to
 * at most 1400px wide, and re-encoded as JPEG at 0.82. A typical phone photo drops from 3-6 MB to
 * roughly 150-300 KB, which is most of the wait on a slow connection.
 */

export const MAX_WIDTH = 1400;
/** Guards very tall screenshots (a whole worksheet page) from staying huge. */
export const MAX_HEIGHT = 2400;
export const QUALITY = 0.82;

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("File could not be read."));
    r.readAsDataURL(blob);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("That image could not be read. Use PNG, JPG, or WEBP."));
    img.src = src;
  });
}

async function decode(input: Blob | string): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void }> {
  if (typeof input !== "string" && typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(input);
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      /* fall back to an <img> element, e.g. for HEIC on some browsers */
    }
  }
  const img = await loadImage(typeof input === "string" ? input : await blobToDataUrl(input));
  return { source: img, width: img.naturalWidth, height: img.naturalHeight };
}

/** Returns a JPEG data URL no wider than maxWidth. Accepts a File/Blob or a data URL. */
export async function compressImage(input: Blob | string, opts: CompressOptions = {}): Promise<string> {
  const maxW = opts.maxWidth ?? MAX_WIDTH;
  const maxH = opts.maxHeight ?? MAX_HEIGHT;
  const quality = opts.quality ?? QUALITY;
  const img = await decode(input);
  try {
    const scale = Math.min(1, maxW / img.width, maxH / img.height);
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot process images.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img.source, 0, 0, w, h);
    const out = canvas.toDataURL("image/jpeg", quality);
    // An already-small JPEG can grow on re-encode; keep whichever is smaller.
    if (typeof input === "string" && input.startsWith("data:image/jpeg") && scale === 1 && input.length < out.length) return input;
    return out;
  } finally {
    img.close?.();
  }
}

/** Compresses many images at once. Order is preserved. */
export function compressAll(inputs: (Blob | string)[], opts?: CompressOptions): Promise<string[]> {
  return Promise.all(inputs.map((x) => compressImage(x, opts)));
}

/** Approximate decoded size of a base64 data URL, in kilobytes. */
export function dataUrlKb(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  return Math.round(((dataUrl.length - i - 1) * 3) / 4 / 1024);
}
