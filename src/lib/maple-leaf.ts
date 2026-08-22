/** Maple leaf helpers — site icon is the MapleStory-style blue leaf PNG. */

/** Prefer the static blue maple leaf for tab icons (theme accent no longer redraws it). */
export function syncThemeFavicon(_hex?: string): void {
  if (typeof document === "undefined") return;
  const href = "/maple-leaf-64.png";
  let link = document.querySelector<HTMLLinkElement>(
    'link[rel="icon"][data-theme-accent]',
  );
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/png";
    link.setAttribute("data-theme-accent", "");
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = href;
}
