import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This allows Vercel to cache MongoDB connections effectively in serverless environments
  serverExternalPackages: ['mongoose']
};

export default nextConfig;
