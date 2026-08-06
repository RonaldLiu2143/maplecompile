"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { storage } from "@/lib/storage";

/** Legacy scouter share URL → character build profile. */
export default function ScouterShareRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  useEffect(() => {
    if (!id) return;
    storage.recordScouterShareView(id);
    router.replace(`/calc/character/share/${encodeURIComponent(id)}`);
  }, [id, router]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="font-display text-2xl font-bold">Opening build…</h1>
      <p className="mt-2 text-sm opacity-75">Redirecting to character profile.</p>
    </div>
  );
}
