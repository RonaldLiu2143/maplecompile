import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

/** Result pages are ephemeral / share-adjacent — keep out of the index. */
export const metadata: Metadata = buildPageMetadata({
  title: "Scouter Result",
  description: "MapleStory scouter calculation result on MapleCompile.",
  path: "/calc/scouter/result",
  noIndex: true,
});

export default function ScouterResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
