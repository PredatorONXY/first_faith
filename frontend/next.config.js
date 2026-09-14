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
      'prisma',
      'bcryptjs',
      'class-transformer',
      'class-validator',
      'google-auth-library',
      'helmet',
      'razorpay',
      'reflect-metadata',
    ],
    outputFileTracingIncludes: {
      '/api/**': [
        '../backend/dist/**',
        '../backend/prisma/**',
        '../backend/package.json',
        '../node_modules/first-faith-backend/**',
        '../node_modules/@nestjs/**',
        '../node_modules/@prisma/**',
        '../node_modules/.prisma/**',
        '../node_modules/pg/**',
        '../node_modules/pg-pool/**',
        '../node_modules/pg-types/**',
        '../node_modules/pg-protocol/**',
        '../node_modules/pg-int8/**',
        '../node_modules/pgpass/**',
        '../node_modules/postgres-array/**',
        '../node_modules/postgres-bytea/**',
        '../node_modules/postgres-date/**',
        '../node_modules/postgres-interval/**',
        '../node_modules/bcryptjs/**',
        '../node_modules/express/**',
        '../node_modules/helmet/**',
        '../node_modules/reflect-metadata/**',
        '../node_modules/rxjs/**',
        '../node_modules/class-transformer/**',
        '../node_modules/class-validator/**',
        '../node_modules/google-auth-library/**',
        '../node_modules/razorpay/**',
        '../node_modules/dotenv/**',
        '../node_modules/tslib/**',
        '../node_modules/iterare/**',
        '../node_modules/path-to-regexp/**',
        '../node_modules/uid/**',
        '../node_modules/body-parser/**',
        '../node_modules/merge-descriptors/**',
        '../node_modules/serve-static/**',
        '../node_modules/lodash/**',
        '../node_modules/safe-buffer/**',
        '../node_modules/cookie/**',
        '../node_modules/cookie-signature/**',
        '../node_modules/cors/**',
        '../node_modules/fast-safe-stringify/**',
        '../node_modules/array-flatten/**',
        '../node_modules/setprototypeof/**',
        '../node_modules/forwarded/**',
        '../node_modules/proxy-addr/**',
        '../node_modules/ipaddr.js/**',
        '../node_modules/type-is/**',
        '../node_modules/media-typer/**',
        '../node_modules/mime-types/**',
        '../node_modules/mime-db/**',
        '../node_modules/accepts/**',
        '../node_modules/negotiator/**',
        '../node_modules/content-disposition/**',
        '../node_modules/content-type/**',
        '../node_modules/depd/**',
        '../node_modules/destroy/**',
        '../node_modules/encodeurl/**',
        '../node_modules/escape-html/**',
        '../node_modules/etag/**',
        '../node_modules/finalhandler/**',
        '../node_modules/fresh/**',
        '../node_modules/http-errors/**',
        '../node_modules/inherits/**',
        '../node_modules/methods/**',
        '../node_modules/on-finished/**',
        '../node_modules/parseurl/**',
        '../node_modules/range-parser/**',
        '../node_modules/send/**',
        '../node_modules/statuses/**',
        '../node_modules/toidentifier/**',
        '../node_modules/unpipe/**',
        '../node_modules/utils-merge/**',
        '../node_modules/vary/**',
        '../node_modules/bytes/**',
        '../node_modules/iconv-lite/**',
        '../node_modules/raw-body/**',
      ],
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
