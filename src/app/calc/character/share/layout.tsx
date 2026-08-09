import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Shared Character Build",
  description: "Shared MapleStory character build on MapleCompile.",
  path: "/calc/character",
  noIndex: true,
});

export default function CharacterShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
