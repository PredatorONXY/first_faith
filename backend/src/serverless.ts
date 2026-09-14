import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import fs from 'fs';
import { AppModule } from './app.module';

// Load .env if running locally or in development
const candidateEnvPaths = [
  resolve(process.cwd(), '.env'),
  resolve(process.cwd(), 'backend/.env'),
  resolve(__dirname, '../../.env'),
  resolve(__dirname, '../../../backend/.env'),
];
for (const envPath of candidateEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

let cachedServer: Express | null = null;
let cachedApp: INestApplication | null = null;
let bootstrapPromise: Promise<{ server: Express; app: INestApplication }> | null = null;

async function bootstrapServerless(): Promise<{ server: Express; app: INestApplication }> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
    rawBody: true,
  });

  // 1. Security & Static Uploads
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const uploadsDir = process.env.UPLOADS_DIR || resolve(process.cwd(), 'uploads');
  if (fs.existsSync(uploadsDir)) {
    app.use('/uploads', express.static(uploadsDir));
  }

  // 2. Backwards compatibility: rewrite /api/v1/* to /api/* internally
  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    if (req.url.startsWith('/api/v1/')) {
      req.url = req.url.replace('/api/v1/', '/api/');
    } else if (req.url === '/api/v1') {
      req.url = '/api';
    }
    next();
  });

  // 3. CORS Configuration
  app.enableCors({
    origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  });

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

  await app.init();

  cachedServer = expressApp;
  cachedApp = app;
  return { server: expressApp, app };
}

export async function getCachedNestServer(): Promise<Express> {
  if (cachedServer) {
    return cachedServer;
  }
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapServerless();
  }
  const { server } = await bootstrapPromise;
  return server;
}

export async function getCachedNestApp(): Promise<INestApplication> {
  if (cachedApp) {
    return cachedApp;
  }
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapServerless();
  }
  const { app } = await bootstrapPromise;
  return app;
}

export default async function serverlessHandler(req: Request, res: Response) {
  const server = await getCachedNestServer();
  return server(req, res);
}

export { ProductsService } from './products/products.service';
export { SettingsService } from './settings/settings.service';
