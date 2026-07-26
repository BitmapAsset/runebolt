/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  distDir: 'dist',
  assetPrefix: '/runebolt',
  basePath: '/runebolt',
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: 'https://runebolt.blockgenomics.io/api/v1',
    NEXT_PUBLIC_WS_URL: 'wss://runebolt.blockgenomics.io/ws',
  },
};

module.exports = nextConfig;
