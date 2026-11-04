/** @type {import('next').NextConfig} */

const nextConfig = {
  reactStrictMode: true,

  // Allows Vercel to handle Mongoose as an external server package
  serverExternalPackages: ['mongoose'],
};

export default nextConfig;
