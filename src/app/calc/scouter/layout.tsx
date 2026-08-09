import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/calc/scouter");

export default function ScouterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
