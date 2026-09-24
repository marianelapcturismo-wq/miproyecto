import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // Acepta tanto una URL completa como solo el host (ej. desde Render
  // Blueprints, donde no se conoce el subdominio final de antemano).
  const toOrigin = (v: string) => (v.includes('://') ? v : `https://${v}`);
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',').map(toOrigin) ?? 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.PORT ?? process.env.API_PORT ?? 3001;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`API escuchando en http://localhost:${port}/api`);
}

bootstrap();
