import { UPLOAD_DIR } from './env';
import { resolve } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  // Auth slot: there is no auth (the tailnet is the access control). When that changes,
  // register the guard here: app.useGlobalGuards(new AuthGuard());

  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  if (origins.length) app.enableCors({ origin: origins });

  app.useStaticAssets(UPLOAD_DIR, { prefix: '/uploads' });

  // Production: serve the built web app from the same port, with an SPA fallback.
  const webDist = process.env.WEB_DIST && resolve(process.env.WEB_DIST);
  if (webDist) {
    app.useStaticAssets(webDist);
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || /^\/(api|uploads)(\/|$)/.test(req.path)) return next();
      res.sendFile(resolve(webDist, 'index.html'));
    });
  }

  await app.listen(Number(process.env.API_PORT) || 3000, process.env.HOST || '0.0.0.0');
}
void bootstrap();
