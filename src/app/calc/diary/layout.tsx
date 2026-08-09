import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/calc/diary");

export default function DiaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
