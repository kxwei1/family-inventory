import { Controller, Get, Param } from "@nestjs/common";
import { StockLogsService } from "./stock-logs.service";

@Controller("api")
export class StockLogsController {
  constructor(private readonly stockLogs: StockLogsService) {}

  @Get("stock-logs")
  listAll() {
    return this.stockLogs.listAll();
  }

  @Get("products/:id/logs")
  listForProduct(@Param("id") id: string) {
    return this.stockLogs.listForProduct(id);
  }
}
