import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/calc/rotations");

export default function RotationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
