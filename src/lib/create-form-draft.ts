const KEY = "headbop:create-form-draft-v2";

export type CreateFormDraft = {
  title: string;
  subject: string;
  keyPoints: string;
  style: string;
  /** When `style === "custom"`, user’s own vibe description */
  customStyleText: string;
  artistId: string;
  vocalGender: string;
};

export function saveCreateFormDraft(d: CreateFormDraft): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* quota / private mode */
  }
}

export function loadCreateFormDraft(): CreateFormDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as Record<string, unknown>;
    return {
      title: typeof j.title === "string" ? j.title : "",
      subject: typeof j.subject === "string" ? j.subject : "",
      keyPoints: typeof j.keyPoints === "string" ? j.keyPoints : "",
      style: typeof j.style === "string" ? j.style : "",
      customStyleText:
        typeof j.customStyleText === "string" ? j.customStyleText : "",
      artistId: typeof j.artistId === "string" ? j.artistId : "",
      vocalGender: typeof j.vocalGender === "string" ? j.vocalGender : "",
    };
  } catch {
    return null;
  }
}

export function clearCreateFormDraft(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
