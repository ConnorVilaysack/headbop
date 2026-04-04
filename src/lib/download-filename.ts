/** Safe basename for Content-Disposition (no path chars). */
export function safeDownloadBasename(title: string): string {
  const base = title
    .replace(/[/\\?%*:|"<>]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return base.length > 0 ? base : "song";
}
