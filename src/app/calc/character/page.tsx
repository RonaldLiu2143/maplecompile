import { redirect } from "next/navigation";

/** Standalone Character Lookup is redundant with Roster search. */
export default function CharacterLookupRedirect() {
  redirect("/roster");
}
