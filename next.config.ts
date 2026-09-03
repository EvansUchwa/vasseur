import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the three pages are fully static, so `next build` produces
  // an `out/` folder that any static host can serve.
  output: "export",
  // Emit app/couvreur-les-ponts-de-ce/index.html (instead of a single .html
  // file) so clean URLs work on plain static servers without rewrite rules.
  trailingSlash: true,
};

export default nextConfig;
