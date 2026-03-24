import { about, personalInfo, projects } from "@/data/portfolio";
import { siteConfig } from "./site";

const websiteId = `${siteConfig.siteUrl}#website`;
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

export function getPersonSchema(): JsonLd {
  return {
    "@type": "Person",
    "@id": personId,
    name: personalInfo.name,
    url: siteConfig.homeUrl,
    description: about.summary,
    email: personalInfo.email,
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
        "@type": "CreativeWork",
        name: project.title,
        description: project.description,
        url: project.live ?? project.github,
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
    "@graph": [getWebsiteSchema(), getPersonSchema(), getProjectsItemListSchema()],
  };
}
