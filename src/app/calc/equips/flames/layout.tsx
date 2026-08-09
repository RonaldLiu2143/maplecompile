import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/calc/equips/flames");

export default function FlamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
