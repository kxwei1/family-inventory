import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { NotificationsModule } from "./notifications/notifications.module";

/**
 * Slim module that loads only what BullMQ workers need: Prisma (to fetch
 * reminder rows when delivering a webhook) and the Notifications module
 * (the dispatcher + worker itself). The HTTP controllers, scheduler, and
 * cache aren't booted in worker mode.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    PrismaModule,
    NotificationsModule,
  ],
})
export class WorkerModule {}
