import { personalInfo, projects } from "@/data/portfolio";
import { siteConfig } from "./site";

const websiteId = `${siteConfig.siteUrl}#website`;
const webpageId = `${siteConfig.siteUrl}#webpage`;
const personId = `${siteConfig.siteUrl}#person`;
const projectListId = `${siteConfig.siteUrl}#projects`;

type JsonLd = Record<string, unknown>;

export function toJsonLd(schema: JsonLd): string {
  return JSON.stringify(schema);
}

export function getWebsiteSchema(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": websiteId,
    url: siteConfig.homeUrl,
    name: siteConfig.siteName,
    description: siteConfig.description,
    inLanguage: siteConfig.locale,
    about: {
      "@id": personId,
    },
  };
}

export function getWebPageSchema(): JsonLd {
  return {
    "@type": "WebPage",
    "@id": webpageId,
    url: siteConfig.homeUrl,
    name: siteConfig.title,
    description: siteConfig.description,
    isPartOf: {
      "@id": websiteId,
    },
    about: {
      "@id": personId,
    },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${siteConfig.siteUrl}${siteConfig.ogImage}`,
    },
    inLanguage: siteConfig.locale,
    dateModified: siteConfig.updatedAt,
  };
}

export function getPersonSchema(): JsonLd {
  return {
    "@type": "Person",
    "@id": personId,
    name: personalInfo.name,
    url: siteConfig.homeUrl,
    description: personalInfo.tagline,
    email: siteConfig.email,
    jobTitle: personalInfo.role,
    sameAs: siteConfig.sameAs,
    homeLocation: {
      "@type": "Place",
      name: siteConfig.geo.placename,
    },
    knowsAbout: siteConfig.keywords,
  };
}

export function getProjectsItemListSchema(): JsonLd {
  return {
    "@type": "ItemList",
    "@id": projectListId,
    name: `${personalInfo.name} Projects`,
    numberOfItems: projects.length,
    itemListElement: projects.map((project, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "SoftwareSourceCode",
        name: project.title,
        description: `${project.summary} ${project.impact}`,
        url: project.live ?? project.github,
        codeRepository: project.github,
        image: project.images[0] ? `${siteConfig.siteUrl}${project.images[0]}` : undefined,
        creator: {
          "@id": personId,
        },
        keywords: project.tech.join(", "),
      },
    })),
  };
}

export function getPortfolioGraph(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [getWebsiteSchema(), getWebPageSchema(), getPersonSchema(), getProjectsItemListSchema()],
  };
}
