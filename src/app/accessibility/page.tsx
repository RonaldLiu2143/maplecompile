import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage } from "@/components/InfoPage";
import { routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/accessibility");

export default function AccessibilityPage() {
  return (
    <InfoPage
      title="Accessibility statement"
      lede="MapleCompile aims to be usable with keyboard, screen readers, and high-contrast themes."
    >
      <h2>Measures we take</h2>
      <ul>
        <li>Skip-to-main-content link on every page</li>
        <li>Document language set to English</li>
        <li>Visible focus styles on navigation and footer links</li>
        <li>Compile, Contrast, and Light themes in the theme picker</li>
        <li>Mobile navigation with an overlay and explicit open/close controls</li>
      </ul>
      <h2>Known limits</h2>
      <p>
        Dense calculator grids (equipment, HEXA, scouter inputs) are inherently
        busy. Some decorative item icons use empty alt text; character avatars
        include the IGN in alt text where they identify a person.
      </p>
      <h2>Feedback</h2>
      <p>
        If you hit a barrier, describe the page and what you expected. Start
        from <Link href="/about">About</Link> or{" "}
        <Link href="/faq">FAQ</Link>. We treat accessibility issues as bugs.
      </p>
      <h2>Compatibility</h2>
      <p>
        We test in current Chrome, Firefox, Safari, and Edge, including
        viewport widths used on phones. JavaScript is required for most
        calculators.
      </p>
    </InfoPage>
  );
}
