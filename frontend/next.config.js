const path = require('path');

/** @type {import('next').NextConfig} */
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
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../'),
    serverComponentsExternalPackages: [
      'first-faith-backend',
      '@nestjs/core',
      '@nestjs/common',
      '@nestjs/platform-express',
      '@nestjs/throttler',
      '@nestjs/config',
      '@nestjs/jwt',
      '@prisma/client',
      '@prisma/adapter-pg',
      'prisma',
      'pg',
      'bcryptjs',
      'class-transformer',
      'class-validator',
      'google-auth-library',
      'helmet',
      'razorpay',
      'reflect-metadata',
    ],
    outputFileTracingIncludes: {
      '/api/**': ['../backend/dist/**', '../backend/prisma/**'],
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const existingExternals = Array.isArray(config.externals)
        ? config.externals
        : [config.externals].filter(Boolean);

      config.externals = [
        ...existingExternals,
        ({ request }, callback) => {
          if (
            request &&
            (request === 'first-faith-backend' ||
              request.startsWith('first-faith-backend/') ||
              /^@nestjs\//.test(request) ||
              /^@prisma\//.test(request) ||
              request === 'prisma' ||
              request === 'pg' ||
              request === 'express' ||
              request === 'class-transformer' ||
              request === 'class-transformer/storage' ||
              request === 'class-validator' ||
              request === 'bcryptjs' ||
              request === 'helmet' ||
              request === 'razorpay' ||
              request.includes('backend/dist'))
          ) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
