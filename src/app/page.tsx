import type { Metadata } from "next";
import { HomeGuideBanner } from "@/components/HomeGuideBanner";
import { HomeHero } from "@/components/HomeHero";
import { JsonLd } from "@/components/JsonLd";
import { FAQ_ITEMS } from "@/lib/faq";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  routeMetadata,
} from "@/lib/seo";

const homeTitle = `${SITE_NAME} — MapleStory Calculators`;
const homeMeta = routeMetadata("/");

export const metadata: Metadata = {
  ...homeMeta,
  title: {
    absolute: homeTitle,
  },
  openGraph: {
    ...homeMeta.openGraph,
    title: homeTitle,
  },
  twitter: {
    ...homeMeta.twitter,
    title: homeTitle,
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

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function Home() {
  return (
    <div className="flex flex-col gap-8 py-6 sm:py-8">
      <JsonLd data={websiteJsonLd} />
      <JsonLd data={appJsonLd} />
      <JsonLd data={faqJsonLd} />
      <HomeGuideBanner />
      <HomeHero />
    </div>
  );
}
