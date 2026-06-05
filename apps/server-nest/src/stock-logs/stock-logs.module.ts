import { Module } from "@nestjs/common";
import { StockLogsController } from "./stock-logs.controller";
import { StockLogsService } from "./stock-logs.service";

@Module({
  controllers: [StockLogsController],
  providers: [StockLogsService],
  exports: [StockLogsService],
})
export class StockLogsModule {}
