import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { WorkerModule } from "./worker.module";

/**
 * Standalone BullMQ worker entrypoint. Boots WorkerModule (which contains
 * PrismaModule + NotificationsModule), so the ReminderWebhookWorker
 * connects to Redis and starts consuming jobs without spinning up any HTTP
 * controllers or the cron scheduler. Run with:
 *
 *   node dist/worker.js
 *
 * Same env file (.env.local / .env) as the API process.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: false,
  });
  app.enableShutdownHooks();

  const logger = new Logger("Worker");
  logger.log("Family Inventory worker started");

  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, shutting down`);
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

void bootstrap();
