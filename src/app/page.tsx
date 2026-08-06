import { HomeGuideBanner } from "@/components/HomeGuideBanner";
import { HomeHero } from "@/components/HomeHero";

export default function Home() {
  return (
    <div className="flex flex-col gap-8 py-6 sm:py-8">
      <HomeGuideBanner />
      <HomeHero />
    </div>
  );
}
