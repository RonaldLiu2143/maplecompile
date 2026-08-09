import type { Metadata } from "next";
import { HomeGuideBanner } from "@/components/HomeGuideBanner";
import { HomeHero } from "@/components/HomeHero";
import { JsonLd } from "@/components/JsonLd";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  routeMetadata,
} from "@/lib/seo";

export const metadata: Metadata = {
  ...routeMetadata("/"),
  title: {
    absolute: `${SITE_NAME} — MapleStory Calculators`,
  },
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/calc/character?name={search_term_string}&region=na`,
    },
    "query-input": "required name=search_term_string",
  },
};

const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "GameApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
};

export default function Home() {
  return (
    <div className="flex flex-col gap-8 py-6 sm:py-8">
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={appJsonLd} />
      <HomeGuideBanner />
      <HomeHero />
    </div>
  );
}
