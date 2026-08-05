"use client";

import { useEffect, useState } from "react";

/**
 * Compact MapleStory character sprite with a fixed footprint.
 * Hides broken images without collapsing layout when `reserveSpace` is set.
 */
export function CharacterSprite({
  src,
  alt,
  size = 40,
  reserveSpace = true,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  size?: number;
  /** Keep a muted box when src is missing or fails (gallery/profile headers). */
  reserveSpace?: boolean;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const show = Boolean(src) && !failed;

  if (!show && !reserveSpace) return null;

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-muted/70 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={!show}
    >
      {show ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-contain"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : null}
    </div>
  );
}
