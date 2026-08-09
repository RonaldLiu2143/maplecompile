import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/roster");

export default function RosterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
