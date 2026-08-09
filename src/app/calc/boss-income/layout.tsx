import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/seo";

/** Legacy alias — prefer /calc/bosses in the sitemap. */
export const metadata: Metadata = buildPageMetadata({
  title: "Boss Income",
  description:
    "Track MapleStory weekly boss clears and crystal meso income for your roster.",
  path: "/calc/bosses",
  noIndex: true,
});

export default function BossIncomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
