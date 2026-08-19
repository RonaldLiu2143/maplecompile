import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, SITE_URL, routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/about");

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: `About ${SITE_NAME}`,
  url: `${SITE_URL}/about`,
  isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
};

export default function AboutPage() {
  return (
    <>
      <JsonLd data={aboutJsonLd} />
      <InfoPage
        title="About MapleCompile"
        lede="Unofficial MapleStory GMS calculators and character tools — free, no account, mostly local to your browser."
      >
        <p>
          MapleCompile helps you look up GMS characters, estimate combat power,
          plan equipment, and track bosses, liberation, and HEXA progress in one
          place.
        </p>
        <h2>Local-first</h2>
        <p>
          Roster, scouter drafts, equipment setups, and trackers live in{" "}
          <strong>localStorage</strong> on this device. We do not require a
          MapleCompile login. Optional public gallery posts are stored only if
          you share a scouter build.
        </p>
        <h2>Trust &amp; affiliation</h2>
        <p>
          MapleCompile is a fan project. It is <strong>not affiliated
          with Nexon</strong>. Names, art, and game systems are © Nexon.
          Calculator output is an estimate and can differ from in-game values.
        </p>
        <h2>Get started</h2>
        <p>
          <Link href="/calc/character">Search a character</Link>
          {" · "}
          <Link href="/calc/scouter">Open Scouter</Link>
          {" · "}
          <Link href="/services">Browse all tools</Link>
          {" · "}
          <Link href="/faq">FAQ</Link>
        </p>
      </InfoPage>
    </>
  );
}
