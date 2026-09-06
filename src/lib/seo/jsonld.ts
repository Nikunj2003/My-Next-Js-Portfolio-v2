import { caseStudies, getCaseStudyPath, type CaseStudy } from "@/data/case-studies";
import { personalInfo, projects } from "@/data/portfolio";
import { siteConfig } from "./site";

const websiteId = `${siteConfig.siteUrl}#website`;
const webpageId = `${siteConfig.siteUrl}#webpage`;
const personId = `${siteConfig.siteUrl}#person`;
const projectListId = `${siteConfig.siteUrl}#projects`;
const caseStudyListId = `${siteConfig.siteUrl}#case-studies`;

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

export function getCaseStudiesItemListSchema(): JsonLd {
  return {
    "@type": "ItemList",
    "@id": caseStudyListId,
    name: `${personalInfo.name} Engineering Case Studies`,
    numberOfItems: caseStudies.length,
    itemListElement: caseStudies.map((study, index) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "TechArticle",
        name: study.title,
        headline: study.title,
        description: study.oneLiner,
        url: `${siteConfig.siteUrl}${getCaseStudyPath(study.slug)}`,
        author: { "@id": personId },
        keywords: [...study.tags, ...study.stack].join(", "),
      },
    })),
  };
}

/** Graph for the `/work` case-study index route. */
export function getWorkIndexGraph(): JsonLd {
  const url = `${siteConfig.siteUrl}/work`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${url}#webpage`,
        url,
        name: `Engineering Case Studies — ${personalInfo.name}`,
        description: `Deep-dive write-ups of ${caseStudies.length} systems and products, each covering constraints, decisions with rejected alternatives, measured results, and explicit ownership.`,
        isPartOf: { "@id": websiteId },
        about: { "@id": personId },
        inLanguage: siteConfig.locale,
        dateModified: siteConfig.updatedAt,
        mainEntity: { "@id": caseStudyListId },
      },
      getCaseStudiesItemListSchema(),
      // Identity nodes, because the CollectionPage above references them by @id
      // and this graph is no longer accompanied by a global one.
      getWebsiteSchema(),
      getPersonSchema(),
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.homeUrl },
          { "@type": "ListItem", position: 2, name: "Case studies", item: url },
        ],
      },
    ],
  };
}

/** Per-page graph for a single case study route. */
export function getCaseStudyGraph(study: CaseStudy): JsonLd {
  const url = `${siteConfig.siteUrl}${getCaseStudyPath(study.slug)}`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "TechArticle",
        "@id": `${url}#article`,
        url,
        name: study.title,
        headline: study.title,
        description: study.oneLiner,
        abstract: study.summary,
        articleSection: study.sections.map((section) => section.heading),
        keywords: [...study.tags, ...study.stack].join(", "),
        inLanguage: siteConfig.locale,
        dateModified: siteConfig.updatedAt,
        author: { "@id": personId },
        publisher: { "@id": personId },
        isPartOf: { "@id": websiteId },
        about: study.employer
          ? { "@type": "Organization", name: study.employer }
          : undefined,
      },
      // Identity nodes, because the TechArticle above credits them by @id.
      getWebsiteSchema(),
      getPersonSchema(),
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: siteConfig.homeUrl },
          { "@type": "ListItem", position: 2, name: "Case studies", item: `${siteConfig.siteUrl}/work` },
          { "@type": "ListItem", position: 3, name: study.title, item: url },
        ],
      },
    ],
  };
}

export function getPortfolioGraph(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      getWebsiteSchema(),
      getWebPageSchema(),
      getPersonSchema(),
      getCaseStudiesItemListSchema(),
      getProjectsItemListSchema(),
    ],
  };
}
