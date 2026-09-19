import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
