import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Guards the glass design system against the class of miss that let the
 * "What was mine" panel ship unblurred through three manual audits.
 *
 * Both earlier sweeps asked the wrong question. One searched only for WHITE
 * fills (`bg-white/5`), so a primary-tinted fill was invisible to it. The other
 * asked "does this element have a fill?" and treated yes as proof it was fine —
 * when the actual defect is having a fill WITHOUT a blur. This test asks the
 * correct question: any large prose/panel surface with a resting fill must also
 * declare a blur source.
 */

const GLASS_TOKENS = [
  "glass",
  "panel-sticky",
  "btn-cta-secondary",
  "glass-tier-surface",
  "glass-tier-chrome",
  "glass-overlay",
  "glass-scrim",
  "backdrop-blur",
  "backdrop-filter",
];

/**
 * Surfaces exempt by design, with the reason each one is legitimate.
 * A new entry here should be a deliberate decision, not a way to silence a fail.
 */
const EXEMPT = [
  // Nested inside an already-glass parent; nesting glass double-blurs.
  "src/components/AITwinChat.tsx",
  "src/components/CommandPalette.tsx",
  "src/components/ProjectImageViewer.tsx",
  // The stacked deck must be fully opaque to occlude cards behind it.
  "src/components/ProjectsSection.tsx",
  // Small icon tiles, inputs, and solid buttons are not glass surfaces.
  "src/components/AboutSection.tsx",
  "src/components/CaseStudyCard.tsx",
  "src/components/ContactSection.tsx",
  "src/components/Navbar.tsx",
  "src/components/ui/select.tsx",
  // Unused shadcn boilerplate with no call sites.
  "src/components/ui/card.tsx",
  "src/components/ui/alert-dialog.tsx",
  "src/components/ui/chart.tsx",
  "src/components/ui/sidebar.tsx",
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith(".tsx")) out.push(full);
  }
  return out;
}

test("large panel surfaces with a fill also declare a blur", () => {
  const offenders: string[] = [];

  for (const file of walk("src")) {
    if (EXEMPT.some((exempt) => file.includes(exempt))) continue;
    const source = readFileSync(file, "utf8");

    for (const match of source.matchAll(/className="([^"]*)"/g)) {
      const cls = match[1];

      // Panel-sized only: p-5/p-6+ padding marks a content surface rather than
      // an icon tile or a chip.
      if (!/rounded-(2xl|3xl|\[)/.test(cls)) continue;
      if (!/\bp-[5-9]\b|\bp-1[0-9]\b/.test(cls)) continue;
      if (GLASS_TOKENS.some((token) => cls.includes(token))) continue;

      // A resting fill of ANY colour — the earlier audits only looked for white.
      const fill = /(?<!hover:)(?<!group-hover:)(?<!focus:)\bbg-(?!transparent|gradient|clip|none)[a-z]+/.exec(cls);
      if (!fill) continue;

      const line = source.slice(0, match.index).split("\n").length;
      offenders.push(`${file}:${line} — fill ${fill[0]} with no blur\n    ${cls.slice(0, 110)}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Panel surfaces are filled but not blurred, so they will read flat beside their siblings:\n  ${offenders.join("\n  ")}`
  );
});
