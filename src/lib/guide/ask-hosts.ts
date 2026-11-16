/**
 * Where a conversation with Nex opens. One decision, made here, for every way
 * of asking (a dock's Ask, the companion, the command palette, a tip).
 *
 * In-page hosts (`hero`, `footer`, `section:<id>`) are places in the layout
 * built to hold the conversation; `float` is the bubble beside the companion
 * (the sheet on phones). Scrolling never moves an open conversation: the host
 * is chosen when it opens and changes only when the visitor asks somewhere
 * else ("Continue here").
 */
export const SECTION_HOSTS = ["about", "experience", "work", "skills", "nex", "contact"] as const;
export type SectionHostId = (typeof SECTION_HOSTS)[number];
export type SectionHost = `section:${SectionHostId}`;
/**
 * A row in another page's flow (`/work`, a case study): `page:header` under
 * the page's header, `page:<anchor>` under a case-study section's heading.
 */
export type PageHost = `page:${string}`;
export type AskHost = "hero" | "footer" | "float" | SectionHost | PageHost;

export function sectionHost(section: string | null | undefined): SectionHost | null {
  return section && (SECTION_HOSTS as readonly string[]).includes(section) ? (`section:${section}` as SectionHost) : null;
}

/** The section a host belongs to, or null for the hero, the footer and the bubble. */
export function hostSection(host: AskHost | null | undefined): SectionHostId | null {
  return host?.startsWith("section:") ? (host.slice("section:".length) as SectionHostId) : null;
}

/** The DOM id of a host's live conversation region. */
export function hostDomId(host: AskHost) {
  return `nex-host-${host.replace(":", "-")}`;
}

export type ResolveInput = {
  /** What the caller asked for, if anything. */
  requested?: AskHost;
  isMobile: boolean;
  /** Nex is in the hero's socket (it hosts the conversation there). */
  heroVisible: boolean;
  /** Nex has landed in the footer's slot. */
  footerDocked: boolean;
  /** The homepage section that owns the screen. */
  section: string | null;
  /** Whether a host is laid out on this page right now. */
  available: (host: AskHost) => boolean;
  /** Off the homepage: the page row for what is being read (the last one above the reading line). */
  nearest?: AskHost | null;
};

export function resolveAskHost({ requested, isMobile, heroVisible, footerDocked, section, available, nearest = null }: ResolveInput): AskHost {
  // Phones: the sheet, always.
  if (isMobile) return "float";
  if (requested === "float") return "float";
  if (requested && available(requested)) return requested;
  if (heroVisible && available("hero")) return "hero";
  if (footerDocked && available("footer")) return "footer";
  const own = sectionHost(section);
  if (own && available(own)) return own;
  if (nearest && available(nearest)) return nearest;
  return "float";
}
