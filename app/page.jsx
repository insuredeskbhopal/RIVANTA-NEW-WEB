import {
  SkipLink, SiteHeader, Hero, About, PartnerNetwork, CaseStudies,
  PartnerMap, Principals, PartnerDirectory, FooterBrand, FooterMetadata,
} from '@/components/site/Sections';
import documentAttributes from '@/content/document.json';

export const dynamic = 'force-static';

export default function HomePage() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id={documentAttributes.main.id} className={documentAttributes.main.class}>
        <Hero />
        <About />
        <PartnerNetwork />
        <CaseStudies />
        <PartnerMap />
        <Principals />
        <PartnerDirectory />
        <FooterBrand />
      </main>
      <FooterMetadata />
    </>
  );
}
