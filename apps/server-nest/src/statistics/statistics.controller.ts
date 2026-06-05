import { Controller, Get, Query } from "@nestjs/common";
import type { StatisticsRange } from "@family-inventory/shared-types";
import { StatisticsService } from "./statistics.service";

@Controller("api/statistics")
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get("summary")
  getSummary(@Query("range") range?: string) {
    return this.statisticsService.getSummary(this.normalizeRange(range));
  }

  private normalizeRange(value: string | undefined): StatisticsRange {
    if (value === "week" || value === "year") return value;
    return "month";
  }
}
