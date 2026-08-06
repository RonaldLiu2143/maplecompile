import { redirect } from "next/navigation";

/** Old /guide bookmarks → dashboard onboarding wizard. */
export default function GuideRedirectPage() {
  redirect("/dashboard#get-started");
}
