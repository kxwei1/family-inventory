import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { LoggingInterceptor } from "./common/logging.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  if (process.env.SWAGGER_ENABLED !== "false") {
    const docConfig = new DocumentBuilder()
      .setTitle("Family Inventory API")
      .setDescription("Production NestJS API mirroring @family-inventory/shared-types")
      .setVersion("0.0.1")
      .build();
    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup("api-docs", app, document);
  }

  const port = Number.parseInt(process.env.PORT ?? "4001", 10);
  await app.listen(port);

  const logger = new Logger("Bootstrap");
  logger.log(`Family Inventory NestJS API listening on http://localhost:${port}`);
  if (process.env.SWAGGER_ENABLED !== "false") {
    logger.log(`Swagger UI available at http://localhost:${port}/api-docs`);
  }
}

void bootstrap();
