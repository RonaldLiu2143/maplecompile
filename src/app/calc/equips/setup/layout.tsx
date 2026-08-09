import type { Metadata } from "next";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/calc/equips/setup");

export default function EquipSetupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
