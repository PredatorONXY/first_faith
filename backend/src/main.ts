import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import express, { Request, Response, NextFunction } from 'express';
import { join, resolve } from 'path';
import fs from 'fs';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';

// Load .env from common locations if present
const candidateEnvPaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'backend/.env'),
  resolve(__dirname, '../../.env'),
];
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

function getFrontendDir(): string {
  if (process.env.FRONTEND_DIR && fs.existsSync(process.env.FRONTEND_DIR)) {
    return process.env.FRONTEND_DIR;
  }
  const candidatePaths = [
    resolve(process.cwd(), 'frontend'),
    resolve(process.cwd(), '../frontend'),
    resolve(__dirname, '../../../frontend'),
    resolve(__dirname, '../../frontend'),
  ];
  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate) && fs.existsSync(join(candidate, 'package.json'))) {
      return candidate;
    }
  }
  return resolve(process.cwd(), 'frontend');
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const expressApp = app.getHttpAdapter().getInstance() as express.Application;

  // 1. Security & Static Uploads
  // Disable CSP in helmet so Next.js hydration scripts and styling render without restriction
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const uploadsDir = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsDir));

  // 2. Backwards compatibility: rewrite /api/v1/* to /api/*
  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    if (req.url.startsWith('/api/v1/')) {
      req.url = req.url.replace('/api/v1/', '/api/');
    } else if (req.url === '/api/v1') {
      req.url = '/api';
    }
    next();
  });

  // 3. CORS Configuration
  // Unified single-origin deployment allows same-origin requests naturally.
  if (process.env.FRONTEND_URL) {
    app.enableCors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    });
  } else {
    app.enableCors({
      origin: true,
      credentials: true,
    });
  }

  // 4. Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 5. Global API Prefix -> /api
  app.setGlobalPrefix('api');

  // 6. Next.js Frontend Integration
  const isDev = process.env.NODE_ENV !== 'production';
  const shouldServeFrontend = process.env.SERVE_FRONTEND !== 'false';

  if (shouldServeFrontend) {
    const frontendDir = getFrontendDir();
    if (fs.existsSync(frontendDir)) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nextFactory = require('next');
      const nextApp = nextFactory({
        dev: isDev,
        dir: frontendDir,
      });

      await nextApp.prepare();
      const nextHandler = nextApp.getRequestHandler();

      // Express middleware: route all non-API, non-upload requests to Next.js
      expressApp.use((req: Request, res: Response, nextFn: NextFunction) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
          return nextFn();
        }
        return nextHandler(req, res);
      });
    }
  }

  await app.init();

  const port = Number(process.env.PORT) || 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`First Faith Unified Server running at: http://localhost:${port}`);
}

bootstrap();
