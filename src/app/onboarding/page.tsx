import { redirect } from "next/navigation";

/** Dedicated onboarding entry → dashboard wizard. */
export default function OnboardingPage() {
  redirect("/dashboard#get-started");
}
