/**
 * Generic silhouette used for anonymous gallery / share profiles
 * instead of the active character’s Nexon sprite.
 */
export function AnonymousShareAvatar({
  size = 40,
  className = "",
  title = "Anonymous",
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border/40 bg-surface-muted/70 text-foreground/55 ${className}`}
      style={{ width: size, height: size }}
      title={title}
      aria-hidden
    >
      <svg
        width={Math.round(size * 0.58)}
        height={Math.round(size * 0.58)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Soft person silhouette */}
        <circle cx="12" cy="8" r="3.25" fill="currentColor" opacity="0.85" />
        <path
          d="M4.5 19.25c0-3.45 3.36-5.75 7.5-5.75s7.5 2.3 7.5 5.75"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          opacity="0.85"
        />
      </svg>
    </div>
  );
}
