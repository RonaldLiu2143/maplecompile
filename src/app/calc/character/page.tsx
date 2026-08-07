import { Suspense } from "react";
import { CharacterSearchPage } from "@/components/character/CharacterSearchPage";

export default function CharacterLookupPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm opacity-70">Loading…</div>
      }
    >
      <CharacterSearchPage />
    </Suspense>
  );
}
