import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/calc/starforce");

export default function StarforceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
