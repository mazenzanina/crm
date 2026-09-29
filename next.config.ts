import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Local live-preview hostnames (production still uses same-origin API requests).
  allowedDevOrigins: ['*.e2b.app'],
  async headers() {
    return [{
      source: '/reset-password',
      headers: [
        // A recovery callback can contain a one-time code in its URL.
        { key: 'Referrer-Policy', value: 'no-referrer' },
        { key: 'Cache-Control', value: 'no-store' },
      ],
    }];
  },
};

export default nextConfig;
