import { redirect } from "next/navigation";

/** Alias for Dashboard manage-roster mode (MapleHub-style /roster). */
export default function RosterPage() {
  redirect("/dashboard?manage=1");
}
