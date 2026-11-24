"use client";

import { useId, useMemo } from "react";
import { MathInline } from "@/components/math/Math";
import { curvePath, ticks, valueTable } from "@/lib/testGraph";
import type { TestGraph as Graph } from "@/lib/types";

/** Color and dash together, so curves stay apart in print and for color-blind students. */
const STYLES = [
  { color: "var(--accent-ink)", dash: undefined },
  { color: "var(--highlight)", dash: "7 5" },
  { color: "var(--text)", dash: "2 4" },
  { color: "var(--success)", dash: "10 4 2 4" },
];

const FONT = 11;
/** Least room a tick label needs before every second one is skipped. */
const X_ROOM = 24;
const Y_ROOM = 16;

/**
 * A figure on a practice test. It has no hover readout on purpose: reading the grid is the question.
 * The same values are in a hidden table for screen readers.
 */
export function TestGraph({ graph, name, small = false }: { graph: Graph; name: string; small?: boolean }) {
  const clip = useId();
  const W = small ? 240 : 360;
  const H = small ? 200 : 320;
  const px = (x: number) => ((x - graph.xMin) / (graph.xMax - graph.xMin)) * W;
  const py = (y: number) => H - ((y - graph.yMin) / (graph.yMax - graph.yMin)) * H;
  const xt = useMemo(() => ticks(graph.xMin, graph.xMax), [graph.xMin, graph.xMax]);
  const yt = useMemo(() => ticks(graph.yMin, graph.yMax), [graph.yMin, graph.yMax]);
  const paths = useMemo(
    () => graph.curves.map((c) => curvePath(c, graph, px, py, H)),
    // px and py follow from the graph and size
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph, W, H],
  );
  const rows = useMemo(() => valueTable(graph), [graph]);

  // Pieces of one function share a label, and so a style.
  const labels = [...new Set(graph.curves.map((c) => c.label))];
  const styleOf = (label: string) => STYLES[Math.max(0, labels.indexOf(label)) % STYLES.length];

  // Axis positions, held at the edge when zero is outside the window.
  const ax = Math.min(W, Math.max(0, px(0)));
  const ay = Math.min(H, Math.max(0, py(0)));
  const every = (n: number, size: number, room: number) => Math.max(1, Math.ceil((room * n) / size));
  const xe = every(xt.length, W, Math.max(X_ROOM, ...xt.map((t) => t.label.length * 6 + 6)));
  const ye = every(yt.length, H, Y_ROOM);
  // Counted from zero, so a skipped label never hides one the axis is read from.
  const x0 = Math.max(0, xt.findIndex((t) => t.v === 0));
  const y0 = Math.max(0, yt.findIndex((t) => t.v === 0));
  const below = ay + FONT + 4 <= H - 2;
  const left = ax >= 26;

  return (
    <figure className={`my-3 w-full break-inside-avoid ${small ? "max-w-[260px]" : "max-w-[400px]"}`}>
      <svg viewBox={`-1 -1 ${W + 2} ${H + 2}`} role="img" aria-label={`${name}. Its values are in the table that follows.`} className="block w-full rounded-[10px] border border-line bg-surface">
        <clipPath id={clip}>
          <rect width={W} height={H} />
        </clipPath>
        <g stroke="var(--muted)" strokeOpacity={0.28} strokeWidth={1} shapeRendering="crispEdges">
          {xt.map((t) => (
            <line key={`x${t.v}`} x1={px(t.v)} x2={px(t.v)} y1={0} y2={H} />
          ))}
          {yt.map((t) => (
            <line key={`y${t.v}`} y1={py(t.v)} y2={py(t.v)} x1={0} x2={W} />
          ))}
        </g>
        <g stroke="var(--text)" strokeWidth={1.25}>
          <line x1={0} x2={W} y1={ay} y2={ay} />
          <line x1={ax} x2={ax} y1={0} y2={H} />
        </g>
        {/* The halo lifts numbers off the grid. Curves are drawn over them, so no part of a curve is ever hidden. */}
        <g fill="var(--text)" fontSize={FONT} className="num" stroke="var(--surface)" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round">
          {xt.map(
            (t, i) =>
              (i - x0) % xe === 0 &&
              t.v !== 0 &&
              px(t.v) > 8 &&
              px(t.v) < W - 8 && (
                <text key={t.v} x={px(t.v)} y={below ? ay + FONT + 3 : ay - 5} textAnchor="middle">
                  {t.label}
                </text>
              ),
          )}
          {yt.map(
            (t, i) =>
              (i - y0) % ye === 0 &&
              t.v !== 0 &&
              py(t.v) > 8 &&
              py(t.v) < H - 8 && (
                <text key={t.v} x={left ? ax - 5 : ax + 5} y={py(t.v) + 4} textAnchor={left ? "end" : "start"}>
                  {t.label}
                </text>
              ),
          )}
          <text x={W - 6} y={ay - 6 > FONT ? ay - 6 : ay + 2 * FONT + 6} textAnchor="end" fontStyle="italic">
            x
          </text>
          <text x={ax + 8 < W - 10 ? ax + 8 : ax - 14} y={FONT + 2} fontStyle="italic">
            y
          </text>
        </g>
        <g clipPath={`url(#${clip})`}>
          {paths.map((d, i) => {
            const s = styleOf(graph.curves[i].label);
            return <path key={i} d={d} fill="none" stroke={s.color} strokeWidth={2.25} strokeDasharray={s.dash} strokeLinejoin="round" strokeLinecap={s.dash ? "butt" : "round"} />;
          })}
        </g>
        {graph.points.map((p, i) => {
          const owner = graph.curves.length ? STYLES[0].color : "var(--accent-ink)";
          return <circle key={i} cx={px(p.x)} cy={py(p.y)} r={4.5} fill={p.open ? "var(--surface)" : owner} stroke={p.open ? owner : "var(--surface)"} strokeWidth={2} />;
        })}
      </svg>
      {labels.filter(Boolean).length > 1 && (
        <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {labels.filter(Boolean).map((l) => (
            <span key={l} className="inline-flex items-center gap-2">
              <svg width={26} height={8} aria-hidden="true">
                <line x1={0} x2={26} y1={4} y2={4} stroke={styleOf(l).color} strokeWidth={2.25} strokeDasharray={styleOf(l).dash} />
              </svg>
              <MathInline latex={l} />
            </span>
          ))}
        </figcaption>
      )}
      <div className="sr-only">
        <table>
          <caption>{name}</caption>
          <thead>
            <tr>
              <th scope="col">x</th>
              {graph.curves.map((c, i) => (
                <th key={i} scope="col">
                  {c.label || "y"}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.x}>
                <th scope="row">{r.x}</th>
                {r.ys.map((y, i) => (
                  <td key={i}>{y}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {graph.points.length > 0 && <p>Marked points: {graph.points.map((p) => `${p.open ? "open" : "filled"} at (${p.x}, ${p.y})`).join(", ")}</p>}
      </div>
    </figure>
  );
}
