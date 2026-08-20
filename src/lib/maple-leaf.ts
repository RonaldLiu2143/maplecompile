/** Maple leaf outline used by BrandMark and the theme-colored favicon. */

export const MAPLE_LEAF_D =
  "M16 3.2c.35 1.4 1.05 2.7 2.15 3.85 1.55-1.7 3.6-2.55 5.85-2.35-.15 2.45-1.15 4.55-2.95 6.05 2.1.55 3.85 1.85 5.05 3.75-2.35.85-4.55.7-6.45-.2.55 2.15.45 4.2-.35 6.1-1.55-1.05-2.7-2.55-3.35-4.4-.65 1.85-1.8 3.35-3.35 4.4-.8-1.9-.9-3.95-.35-6.1-1.9.9-4.1 1.05-6.45.2 1.2-1.9 2.95-3.2 5.05-3.75C7.15 9.25 6.15 7.15 6 4.7c2.25-.2 4.3.65 5.85 2.35C13 5.9 13.7 4.6 16 3.2Z";

export const MAPLE_STEM_D = "M16 28.5V18.2";

export function mapleLeafOutlineSvg(hex: string): string {
  const c = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#3b82f6";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="${MAPLE_LEAF_D}" stroke="${c}" stroke-width="1.55" stroke-linejoin="round"/><path d="${MAPLE_STEM_D}" stroke="${c}" stroke-width="1.75" stroke-linecap="round"/></svg>`;
}

/** Live tab icon — SVG stroke follows the current accent hex. */
export function syncThemeFavicon(hex: string): void {
  if (typeof document === "undefined") return;
  const href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(mapleLeafOutlineSvg(hex))}`;
  let link = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"][data-theme-accent]',
  );
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.setAttribute("data-theme-accent", "");
    document.head.appendChild(link);
  }
  link.href = href;
}

