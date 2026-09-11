/** @type {import('next').NextConfig} */
const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL ||
  (process.env.INTERNAL_API_URL ? process.env.INTERNAL_API_URL.replace(/\/api(\/v1)?\/?$/, '') : null) ||
  'http://localhost:4000';

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '4000',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3000',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_INTERNAL_URL}/api/:path*`,
      },
      {
        source: '/api/v1/:path*',
        destination: `${BACKEND_INTERNAL_URL}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${BACKEND_INTERNAL_URL}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

