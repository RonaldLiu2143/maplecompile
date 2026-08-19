import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/privacy");

export default function PrivacyPage() {
  return (
    <InfoPage
      title="Privacy policy"
      lede="Last updated August 19, 2026. MapleCompile is built to keep most data on your device."
    >
      <h2>What we collect on your device</h2>
      <p>
        Calculators, roster, equipment setups, HEXA, bosses, and similar
        progress are stored in your browser (localStorage). That data does not
        go to MapleCompile servers unless you take an action that sends it
        (for example posting a scouter gallery share).
      </p>
      <h2>Character lookup</h2>
      <p>
        When you search an IGN, our server requests public ranking and MapleHub
        character data and returns it to your browser. We do not use a Nexon
        account login. Lookup is limited to characters that appear in those
        public sources.
      </p>
      <h2>Optional shared builds</h2>
      <p>
        If you share a scouter loadout publicly or via a private link, the
        payload is stored in Redis (Upstash) so others can open the link. Do
        not include real-world personal information in share names or notes.
      </p>
      <h2>Analytics</h2>
      <p>
        If Google Analytics (GA4) is enabled on this deployment, it may collect
        page views and similar usage with IP anonymization. You can block it
        with a browser tracker-blocker. Analytics is not required for the
        tools to work.
      </p>
      <h2>Cookies</h2>
      <p>
        Core tools do not require login cookies. Theme and sidebar preferences
        are stored locally. Third-party scripts (if Analytics is enabled) may
        set their own cookies.
      </p>
      <h2>Third parties</h2>
      <p>
        Character and ranking data may come from Nexon and MapleHub. Their
        sites have their own privacy practices. Equipment icon CDNs may see
        image requests from your browser.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about this policy: see{" "}
        <Link href="/about">About</Link> and{" "}
        <Link href="/faq">FAQ</Link>. For accessibility, see the{" "}
        <Link href="/accessibility">accessibility statement</Link>.
      </p>
    </InfoPage>
  );
}
