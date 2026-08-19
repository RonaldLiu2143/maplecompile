import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/terms");

export default function TermsPage() {
  return (
    <InfoPage
      title="Terms and conditions"
      lede="Last updated August 19, 2026. By using MapleCompile you agree to these terms."
    >
      <h2>Unofficial fan tools</h2>
      <p>
        MapleCompile is not affiliated with, endorsed by, or sponsored by Nexon.
        MapleStory and related marks are © Nexon. Use of the game’s names and
        data is for informational fan tools only.
      </p>
      <h2>No warranty</h2>
      <p>
        Calculators, ranks, EXP graphs, and combat power estimates can be
        wrong or outdated. Do not treat results as official in-game values or
        financial advice (meso costs are estimates).
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not abuse share endpoints, scrape in a way that harms third-party
        APIs we proxy, post illegal or abusive content in public gallery
        names, or attempt to disrupt the service.
      </p>
      <h2>Your data</h2>
      <p>
        You are responsible for what you store locally and what you publish in
        shares. See the <Link href="/privacy">privacy policy</Link> for how
        storage and optional analytics work.
      </p>
      <h2>Changes</h2>
      <p>
        We may update these terms as the site changes. Continued use after an
        update means you accept the new terms.
      </p>
    </InfoPage>
  );
}
