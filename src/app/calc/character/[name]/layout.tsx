import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

/** Legacy path redirects to `?name=` — do not index the path form. */
export const metadata: Metadata = buildPageMetadata({
  title: "Character",
  description: "MapleStory character lookup on MapleCompile.",
  path: "/calc/character",
  noIndex: true,
});

export default function CharacterNameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
