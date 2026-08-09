import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPageMetadata({
  title: "Shared Scouter Build",
  description: "Shared MapleStory scouter build on MapleCompile.",
  path: "/calc/scouter",
  noIndex: true,
});

export default function ScouterShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
