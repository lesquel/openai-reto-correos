import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

const root = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  // Pin the project root so a lockfile in a parent folder is never picked as the workspace.
  turbopack: { root },
  outputFileTracingRoot: root,
  async rewrites() {
    return [
      { source: "/slides", destination: "/slides/index.html" },
      { source: "/reto", destination: "/reto/index.html" },
    ];
  },
};

export default nextConfig;
