import Image from "next/image";

const LOGO_SRC = "/headbop-logo.png";

type LogoMarkProps = {
  /** Pixel size of the logo asset (square). */
  size?: number;
  /** Extra classes on the image. */
  className?: string;
  /** Optional tile around the mark (navbar). */
  withTile?: boolean;
  tileClassName?: string;
  priority?: boolean;
};

/**
 * User-provided quarter-note artwork from `/public/headbop-logo.png`.
 */
export function LogoMark({
  size = 26,
  className = "",
  withTile = true,
  tileClassName,
  priority = false,
}: LogoMarkProps) {
  const img = (
    <Image
      src={LOGO_SRC}
      alt=""
      width={size}
      height={size}
      className={`object-contain ${className}`}
      priority={priority}
    />
  );

  if (!withTile) {
    return (
      <span className="inline-flex shrink-0 items-center justify-center">{img}</span>
    );
  }

  return (
    <div
      className={
        tileClassName ??
        "flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white p-1 shadow-sm"
      }
    >
      {img}
    </div>
  );
}
