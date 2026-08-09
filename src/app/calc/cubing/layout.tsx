import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/calc/cubing");

export default function CubingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
