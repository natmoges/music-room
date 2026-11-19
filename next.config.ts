import type { NextConfig } from "next";

// output: 'export' writes plain HTML to out/, which Cloudflare Pages serves for free.
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
