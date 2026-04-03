"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Infinite scrolling grid + cursor-follow spotlight.
 * Pure CSS animation + CSS variables for the mask (updated after mount only) so SSR HTML matches the client.
 */
export function CreatePageBackground() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const setSpot = (clientX: number, clientY: number) => {
      const r = root.getBoundingClientRect();
      root.style.setProperty("--spot-x", `${clientX - r.left}px`);
      root.style.setProperty("--spot-y", `${clientY - r.top}px`);
    };

    const center = () => {
      const r = root.getBoundingClientRect();
      setSpot(r.left + r.width / 2, r.top + r.height / 2);
    };

    const onMove = (e: MouseEvent) => setSpot(e.clientX, e.clientY);

    center();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", center);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", center);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn(
        "create-page-bg pointer-events-none fixed inset-0 z-[1] overflow-hidden bg-[#f7f5ef]"
      )}
      aria-hidden
    >
      <div className="create-page-bg-grid absolute inset-0" />
      <div className="create-page-bg-grid-spot absolute inset-0" />
      <div className="absolute inset-0">
        <div className="absolute right-[-15%] top-[-15%] h-[38%] w-[38%] rounded-full bg-purple/20 blur-[120px]" />
        <div className="absolute right-[8%] top-[-8%] h-[22%] w-[22%] rounded-full bg-gold/20 blur-[100px]" />
        <div className="absolute bottom-[-18%] left-[-10%] h-[36%] w-[36%] rounded-full bg-purple-light/20 blur-[120px]" />
      </div>
    </div>
  );
}
