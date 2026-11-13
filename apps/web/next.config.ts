import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep generated coding-agent instructions out of the submitted project.
  agentRules: false,
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  // The floating dev badge covers the mobile tab bar; error overlays still show.
  devIndicators: false,
  turbopack: {
    // Repo root, so the app can import packages/shared.
    root: path.join(__dirname, "../.."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
