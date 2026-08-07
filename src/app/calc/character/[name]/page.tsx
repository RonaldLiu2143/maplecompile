import { redirect } from "next/navigation";
import { normalizeRegion } from "@/lib/character/lookup";

/** Legacy `/calc/character/[name]` bookmarks → query-param search page. */
export default async function CharacterNameRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ region?: string | string[] }>;
}) {
  const { name: raw } = await params;
  const sp = await searchParams;
  const regionRaw = Array.isArray(sp.region) ? sp.region[0] : sp.region;
  const region = normalizeRegion(regionRaw) ?? "na";
  let name: string;
  try {
    name = decodeURIComponent(raw ?? "").trim();
  } catch {
    // Malformed % sequences throw URIError — fall back to raw segment.
    name = (raw ?? "").trim();
  }
  if (!name) {
    redirect("/calc/character");
  }
  redirect(
    `/calc/character?name=${encodeURIComponent(name)}&region=${region}`,
  );
}
