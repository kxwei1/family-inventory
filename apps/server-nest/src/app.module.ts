import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { CommonModule } from "./common/common.module";
import { HealthController } from "./health/health.controller";
import { FamilyModule } from "./family/family.module";
import { ProductsModule } from "./products/products.module";
import { PetsModule } from "./pets/pets.module";
import { StockLogsModule } from "./stock-logs/stock-logs.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    PrismaModule,
    CommonModule,
    FamilyModule,
    ProductsModule,
    PetsModule,
    StockLogsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
