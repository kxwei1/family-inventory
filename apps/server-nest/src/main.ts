import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const port = Number.parseInt(process.env.PORT ?? "4001", 10);
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`Family Inventory NestJS API listening on http://localhost:${port}`);
}

void bootstrap();
