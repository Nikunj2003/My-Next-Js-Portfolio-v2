import type { NextConfig } from "next";

/**
 * Baseline headers for every page. A full Content-Security-Policy is left out
 * for now: the inline theme bootstrap in layout.tsx would need a hash or nonce.
 * Artifacts set their own sandboxing CSP in their route.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Everything except hosted artifacts, which may be embedded elsewhere.
        source: "/((?!artifacts/|api/artifacts/).*)",
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    return [
      {
        // Public-facing artifact URLs stay on the portfolio's own domain with
        // no /api prefix, e.g. https://nikunj.codenex.dev/artifacts/<slug>/<file>.
        source: "/artifacts/:slug/:file",
        destination: "/api/artifacts/:slug/:file",
      },
    ];
  },
};

export default nextConfig;
