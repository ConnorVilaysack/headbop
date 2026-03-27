/** Vibe id stored on Song + sent to KIE `style` as the label only. */
export const VIBES = [
  { id: "rap", label: "Rap" },
  { id: "trap", label: "Trap" },
  { id: "hip-hop", label: "Hip-Hop" },
  { id: "pop", label: "Pop" },
  { id: "r-and-b", label: "R&B" },
  { id: "soul", label: "Soul" },
  { id: "indie", label: "Indie" },
  { id: "rock", label: "Rock" },
  { id: "punk", label: "Punk" },
  { id: "metal", label: "Metal" },
  { id: "electronic", label: "Electronic" },
  { id: "edm", label: "EDM" },
  { id: "house", label: "House" },
  { id: "jazz", label: "Jazz" },
  { id: "lo-fi", label: "Lo-fi" },
  { id: "country", label: "Country" },
  { id: "folk", label: "Folk" },
  { id: "reggae", label: "Reggae" },
  { id: "latin", label: "Latin" },
  { id: "funk", label: "Funk" },
  { id: "blues", label: "Blues" },
  { id: "gospel", label: "Gospel" },
] as const;

export type VibeId = (typeof VIBES)[number]["id"];

export function getVibeLabel(id: string): string {
  const v = VIBES.find((x) => x.id === id);
  return v?.label ?? id;
}
