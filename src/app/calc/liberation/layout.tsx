import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/calc/liberation");

export default function LiberationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
