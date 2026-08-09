import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/calc/scouter/gallery");

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
