import { redirect } from "next/navigation";

/** Boss Schedule UI removed — keep route for old bookmarks. */
export default function BossScheduleRemovedPage() {
  redirect("/calc/bosses");
}
