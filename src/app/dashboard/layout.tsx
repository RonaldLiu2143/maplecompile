import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/dashboard");

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
