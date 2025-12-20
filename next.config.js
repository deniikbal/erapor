/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  experimental: {
    // Disable Turbopack to avoid Windows symlink permission issues with pg package
    turbo: false,
  },
};

module.exports = nextConfig;
