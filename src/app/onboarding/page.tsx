import { redirect } from "next/navigation";

/** Legacy /onboarding bookmarks → Guide. */
export default function OnboardingPage() {
  redirect("/guide");
}
