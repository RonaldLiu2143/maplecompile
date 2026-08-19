import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { JsonLd } from "@/components/JsonLd";
import { FAQ_ITEMS } from "@/lib/faq";
import { SITE_NAME, SITE_URL, routeMetadata } from "@/lib/seo";

export const metadata: Metadata = routeMetadata("/faq");

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
  url: `${SITE_URL}/faq`,
  isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
};

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqJsonLd} />
      <InfoPage
        title="Frequently asked questions"
        lede="Storage, character lookup, sharing, and affiliation."
      >
        {FAQ_ITEMS.map((item) => (
          <div key={item.question}>
            <h2>{item.question}</h2>
            <p>{item.answer}</p>
          </div>
        ))}
      </InfoPage>
    </>
  );
}
