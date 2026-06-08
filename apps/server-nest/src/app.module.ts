import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { PrismaModule } from "./prisma/prisma.module";
import { CommonModule } from "./common/common.module";
import { AuthModule } from "./auth/auth.module";
import { HealthController } from "./health/health.controller";
import { FamilyModule } from "./family/family.module";
import { ProductsModule } from "./products/products.module";
import { PetsModule } from "./pets/pets.module";
import { StockLogsModule } from "./stock-logs/stock-logs.module";
import { ProfileModule } from "./profile/profile.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { RemindersModule } from "./reminders/reminders.module";
import { RestockModule } from "./restock/restock.module";
import { StatisticsModule } from "./statistics/statistics.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    CommonModule,
    AuthModule,
    FamilyModule,
    ProductsModule,
    PetsModule,
    StockLogsModule,
    ProfileModule,
    DashboardModule,
    RemindersModule,
    RestockModule,
    StatisticsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
