import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Local live-preview hostnames (production still uses same-origin API requests).
  allowedDevOrigins: ['*.e2b.app'],
};

export default nextConfig;
