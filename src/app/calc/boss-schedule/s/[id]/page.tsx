import { redirect } from "next/navigation";

/** Shared schedule links redirect after Boss Schedule removal. */
export default function BossScheduleShareRemovedPage() {
  redirect("/calc/bosses");
}
