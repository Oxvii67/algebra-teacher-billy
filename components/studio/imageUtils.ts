export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image could not be read."));
    img.src = src;
  });
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("File could not be read."));
    r.readAsDataURL(file);
  });
}

/** Rotates an image by any angle, expanding the canvas so nothing is clipped. */
export async function rotateImage(src: string, degrees: number): Promise<string> {
  const img = await loadImage(src);
  const rad = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const w = Math.round(img.width * cos + img.height * sin);
  const h = Math.round(img.width * sin + img.height * cos);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  return c.toDataURL("image/png");
}

export interface CropRect {
  /** Fractions of the image, 0..1 */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Crops and downsizes for upload. Output is JPEG, longest edge at most maxEdge. */
export async function cropImage(src: string, rect: CropRect, maxEdge = 1600): Promise<string> {
  const img = await loadImage(src);
  const sx = Math.round(rect.x * img.width);
  const sy = Math.round(rect.y * img.height);
  const sw = Math.max(1, Math.round(rect.w * img.width));
  const sh = Math.max(1, Math.round(rect.h * img.height));
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const c = document.createElement("canvas");
  c.width = Math.round(sw * scale);
  c.height = Math.round(sh * scale);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.9);
}

export async function shrinkImage(src: string, maxEdge = 1600): Promise<string> {
  return cropImage(src, { x: 0, y: 0, w: 1, h: 1 }, maxEdge);
}
