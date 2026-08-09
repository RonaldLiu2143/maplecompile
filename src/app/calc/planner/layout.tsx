import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/calc/planner");

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
