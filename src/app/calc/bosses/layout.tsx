import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/calc/bosses");

export default function BossesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
