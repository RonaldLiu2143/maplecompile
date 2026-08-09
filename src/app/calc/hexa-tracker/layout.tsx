import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/calc/hexa-tracker");

export default function HexaTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
