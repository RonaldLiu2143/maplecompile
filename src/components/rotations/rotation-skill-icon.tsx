import type { ClassSkillDef } from "@/lib/rotations";
import { rotationIconUrl } from "@/lib/rotations/icon";

export function RotationSkillIcon({
  skill,
  size = 28,
}: {
  skill: ClassSkillDef | undefined;
  size?: number;
}) {
  const src = rotationIconUrl(skill?.iconSuffix);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="rounded object-contain"
        draggable={false}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded bg-surface-muted text-[10px] font-semibold text-muted-foreground"
      style={{ width: size, height: size }}
    >
      {(skill?.name ?? "?").slice(0, 2)}
    </span>
  );
}

export const SKILL_DRAG_MIME = "application/x-maplecompile-skill-id";
