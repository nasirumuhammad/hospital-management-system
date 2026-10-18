import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@healthcare/types'],
  poweredByHeader: false,
};

export default nextConfig;
