/** Deterministic rainbow styles for selected pills (SSR-safe). */

export type RainbowSlice = {
  border: string;
  bg: string;
  text: string;
  ring: string;
};

export const RAINBOW_ACTIVE: readonly RainbowSlice[] = [
  { border: "border-rose-500", bg: "bg-rose-100/95", text: "text-rose-950", ring: "ring-rose-400/40" },
  { border: "border-orange-500", bg: "bg-orange-100/95", text: "text-orange-950", ring: "ring-orange-400/40" },
  { border: "border-amber-500", bg: "bg-amber-100/95", text: "text-amber-950", ring: "ring-amber-400/40" },
  { border: "border-lime-500", bg: "bg-lime-100/95", text: "text-lime-950", ring: "ring-lime-400/40" },
  { border: "border-emerald-500", bg: "bg-emerald-100/95", text: "text-emerald-950", ring: "ring-emerald-400/40" },
  { border: "border-cyan-500", bg: "bg-cyan-100/95", text: "text-cyan-950", ring: "ring-cyan-400/40" },
  { border: "border-sky-500", bg: "bg-sky-100/95", text: "text-sky-950", ring: "ring-sky-400/40" },
  { border: "border-blue-500", bg: "bg-blue-100/95", text: "text-blue-950", ring: "ring-blue-400/40" },
  { border: "border-indigo-500", bg: "bg-indigo-100/95", text: "text-indigo-950", ring: "ring-indigo-400/40" },
  { border: "border-violet-500", bg: "bg-violet-100/95", text: "text-violet-950", ring: "ring-violet-400/40" },
  { border: "border-fuchsia-500", bg: "bg-fuchsia-100/95", text: "text-fuchsia-950", ring: "ring-fuchsia-400/40" },
  { border: "border-pink-500", bg: "bg-pink-100/95", text: "text-pink-950", ring: "ring-pink-400/40" },
] as const;

export function rainbowSlice(index: number): RainbowSlice {
  return RAINBOW_ACTIVE[index % RAINBOW_ACTIVE.length]!;
}

export function rainbowActiveClasses(index: number): string {
  const s = rainbowSlice(index);
  return `${s.border} ${s.bg} ${s.text} shadow-sm ring-2 ${s.ring}`;
}

/** Stable color bucket from a string (e.g. artist id). */
export function rainbowIndexFromString(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rainbowActiveClassesForId(id: string): string {
  return rainbowActiveClasses(rainbowIndexFromString(id));
}
