import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'export',
  // ensure static routes resolve when refreshing nested pages
  trailingSlash: true,
};

export default nextConfig;
