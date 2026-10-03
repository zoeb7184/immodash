import type { NextConfig } from "next";

// Fully static site: `next build` writes plain HTML/JS/JSON to out/, served from a CDN (Vercel,
// Cloudflare Pages, GitHub Pages). No server, no cold starts.
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  poweredByHeader: false,
  images: { unoptimized: true },
};

export default nextConfig;
