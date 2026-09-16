import type { Metadata } from "next";
import { siteConfig } from "@/site.config";

const baseUrl = siteConfig.url;

type PageMetaInput = {
  title: string;
  description: string;
  path: string;
  /** Set false on utility pages that should stay out of search results. */
  index?: boolean;
};

/** Per-page metadata, Open Graph and canonical URL in one call. */
export function pageMetadata({ title, description, path, index = true }: PageMetaInput): Metadata {
  const url = `${baseUrl}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: index ? undefined : { index: false, follow: true },
    openGraph: {
      type: "website",
      url,
      title: `${title} | ${siteConfig.company.name}`,
      description,
      siteName: siteConfig.company.name,
      locale: "en_IE",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.company.name}`,
      description,
    },
  };
}

/** Organization structured data, emitted once in the root layout. */
export function organizationSchema() {
  const { company, contact, social } = siteConfig;
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: company.name,
    legalName: company.legalEntity,
    url: baseUrl,
    description: company.description,
    email: contact.email,
    telephone: contact.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: `${contact.address.line1}, ${contact.address.line2}`,
      addressLocality: contact.address.city,
      postalCode: contact.address.postcode,
      addressCountry: "IE",
    },
    sameAs: [social.linkedin],
    areaServed: ["IE", "EU"],
  };
}

/** Service structured data for the service pages. */
export function serviceSchema({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    serviceType: name,
    url: `${baseUrl}${path}`,
    provider: {
      "@type": "Organization",
      name: siteConfig.company.name,
      url: baseUrl,
    },
    areaServed: [
      { "@type": "Country", name: "Ireland" },
      { "@type": "Place", name: "European Union" },
    ],
    audience: {
      "@type": "BusinessAudience",
      audienceType: "Mid-size and large organisations",
    },
  };
}

/** Renders a JSON-LD script tag. */
export function jsonLdProps(schema: object) {
  return {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: JSON.stringify(schema) },
  } as const;
}
