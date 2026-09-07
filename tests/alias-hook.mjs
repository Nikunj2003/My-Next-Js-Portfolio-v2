import { pathToFileURL } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";

const srcDir = resolvePath(dirname(fileURLToPath(import.meta.url)), "..", "src");

/**
 * Resolves the project's `@/*` path alias for `node --test`.
 *
 * tsconfig paths are a TypeScript-only concept, so bare Node cannot follow
 * them. Without this, any module under test that uses `@/` fails with
 * ERR_MODULE_NOT_FOUND — which previously forced tested modules to avoid the
 * alias the rest of the codebase uses.
 */
import { existsSync } from "node:fs";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = resolvePath(srcDir, specifier.slice(2));

    // Source files import without an extension; Node's ESM resolver requires one.
    for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
      if (existsSync(candidate)) {
        return nextResolve(pathToFileURL(candidate).href, context);
      }
    }
  }
  // Next ships `next/server` et al. without the extension Node's ESM resolver
  // demands, so a route handler under test fails to load at all. Retrying with
  // `.js` is what lets tests exercise real route modules instead of only the
  // pure helpers beside them.
  if (specifier.startsWith("next/")) {
    try {
      return await nextResolve(specifier, context);
    } catch {
      return nextResolve(`${specifier}.js`, context);
    }
  }

  return nextResolve(specifier, context);
}
