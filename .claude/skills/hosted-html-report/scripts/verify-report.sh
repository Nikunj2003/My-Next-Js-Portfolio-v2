#!/usr/bin/env bash
# Verify an HTML report before hosting it.
#
# Usage:  verify-report.sh <report.html> [--quick]
#
#   default : structure checks + headless-browser layout checks
#   --quick : structure only (no browser, no npx downloads)
#
# Why this exists: rendering defects (dark text on a dark header, empty/broken
# inline SVG diagrams, dangling nav anchors) are invisible to source
# inspection. Everything here is measured from the DOM instead: computed
# styles and bounding boxes, not a screenshot someone eyeballs.
#
# Exit codes: 0 all checks pass · 1 usage · 2 structural failure · 3 render failure

set -uo pipefail
F="${1:-}"; MODE="${2:-}"
[ -n "$F" ] && [ -f "$F" ] || { echo "usage: verify-report.sh <report.html> [--quick]" >&2; exit 1; }

CHROME="${CHROME_PATH:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
FAIL=0

echo "== structure =="
python3 - "$F" <<'PY' || FAIL=2
import re,sys
h=open(sys.argv[1],encoding='utf-8').read()
bad=0
for t in ['html','head','body','style','script','section','table','figure','svg','nav','main','div']:
    o=len(re.findall(r'<%s[\s>]'%t,h)); c=len(re.findall(r'</%s>'%t,h))
    if o!=c: print(f"  FAIL <{t}> {o} open / {c} close"); bad=1
print("  tag balance: "+("OK" if not bad else "MISMATCH"))

ids=set(re.findall(r'<section id="([^"]+)"',h)); nav=set(re.findall(r'href="#([^"]+)"',h))
dangling=nav-ids
print(f"  sections {len(ids)} · nav links {len(nav)} · dangling {sorted(dangling) if dangling else 'none'}")
if dangling: bad=1

svgs=re.findall(r'<svg\b[^>]*>',h)
missing_viewbox=[s for s in svgs if 'viewBox=' not in s]
print(f"  inline svg diagrams: {len(svgs)}")
if missing_viewbox:
    print(f"  FAIL {len(missing_viewbox)} <svg> without a viewBox"); bad=1

raw=len(h.encode())
print(f"  size: {raw:,} raw bytes (no enforced ceiling)")
sys.exit(bad)
PY

[ "$MODE" = "--quick" ] && { echo; [ $FAIL -eq 0 ] && echo "quick checks passed" || echo "quick checks FAILED"; exit $FAIL; }
[ -x "$CHROME" ] || { echo; echo "skip: Chrome not found at $CHROME (set CHROME_PATH)"; exit $FAIL; }

# ------------------------------------------------- rendered layout (real DOM)
echo; echo "== rendered layout =="
W="$(mktemp -d)"; ( cd "$W" && npm init -y >/dev/null 2>&1 && npm install puppeteer-core@23 >/dev/null 2>&1 )
cat > "$W/check.mjs" <<'JS'
import puppeteer from 'puppeteer-core';
const [file, chrome] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: chrome, headless: 'shell',
  args: ['--no-sandbox','--disable-setuid-sandbox','--allow-file-access-from-files'] });
const p = await b.newPage(); await p.setViewport({ width: 1400, height: 1000 });
const errs = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await p.goto('file://' + file, { waitUntil: 'networkidle0', timeout: 60000 });
await new Promise(r => setTimeout(r, 500));
const o = await p.evaluate(() => {
  const svgs = [...document.querySelectorAll('.diagram svg')];
  const emptySvgs = svgs.filter(s => s.querySelectorAll('text').length === 0).length;
  // text sitting on a dark background but rendering dark = the CSS inheritance
  // trap: a direct rule (e.g. p{color:...}) always beats an inherited colour
  const lowContrast = [...document.querySelectorAll('header p, header h1, header .eyebrow, header a')]
    .filter(e => {
      const c = getComputedStyle(e).color.match(/\d+/g);
      if (!c) return false;
      const lum = (0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]) / 255;
      let bg = e, seen = '';
      while (bg && bg !== document.body) {
        const s = getComputedStyle(bg);
        if (s.backgroundImage !== 'none' || (s.backgroundColor && s.backgroundColor !== 'rgba(0, 0, 0, 0)')) { seen = s.backgroundColor + s.backgroundImage; break; }
        bg = bg.parentElement;
      }
      return /gradient|rgb\((?:[0-9]|[1-9][0-9])[, ]/.test(seen) && lum < 0.5;
    }).map(e => e.tagName + '.' + e.className);
  return {
    diagramCount: svgs.length,
    emptySvgs,
    darkTextOnDarkBg: lowContrast,
    widest: Math.max(0, ...svgs.map(s => Math.round(s.getBoundingClientRect().width))),
    tallest: Math.max(0, ...svgs.map(s => Math.round(s.getBoundingClientRect().height)))
  };
});
o.pageErrors = errs.slice(0, 5);
console.log(JSON.stringify(o, null, 2));
await b.close();
JS
node "$W/check.mjs" "$(cd "$(dirname "$F")" && pwd)/$(basename "$F")" "$CHROME" > "$W/res.json" 2>"$W/err.txt"
if [ -s "$W/res.json" ]; then
  cat "$W/res.json"
  python3 - "$W/res.json" <<'PY' || FAIL=3
import json,sys
r=json.load(open(sys.argv[1])); bad=[]
if r["emptySvgs"]: bad.append(f'{r["emptySvgs"]} diagram(s) with no text labels — likely empty/broken')
if r["darkTextOnDarkBg"]: bad.append('dark text on dark background: '+", ".join(r["darkTextOnDarkBg"]))
if r["pageErrors"]: bad.append('page errors: '+"; ".join(r["pageErrors"]))
if r["widest"] and r["widest"]<380 and r["tallest"]>1200:
    print("  note: a diagram is very tall and narrow; consider reorienting for readability")
print()
if bad:
    print("RENDER CHECKS FAILED"); [print("  - "+b) for b in bad]; sys.exit(1)
print("render checks passed")
PY
else
  echo "  FAIL browser check did not run"; sed -n '1,6p' "$W/err.txt"; FAIL=3
fi
rm -rf "$W"

echo
[ $FAIL -eq 0 ] && echo "ALL CHECKS PASSED — safe to host" || echo "CHECKS FAILED (exit $FAIL) — fix before hosting"
exit $FAIL
