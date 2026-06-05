import { Injectable } from "@nestjs/common";
import { StockLog } from "@prisma/client";
import type {
  StatisticsRange,
  StatisticsSummary,
} from "@family-inventory/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { FamilyContextService } from "../common/family-context.service";

interface ExpenseRecord {
  id: string;
  productId: string;
  productName: string;
  productImage?: string;
  productArchived?: boolean;
  category: string;
  amount: number;
  occurredAt: Date;
}

@Injectable()
export class StatisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: FamilyContextService,
  ) {}

  async getSummary(range: StatisticsRange): Promise<StatisticsSummary> {
    const familyId = await this.context.resolveFamilyId();
    const now = new Date();
    const records = await this.loadRecords(familyId, range, now);

    const total = records.reduce((sum, record) => sum + record.amount, 0);
    const days = this.dayCount(range);
    const averageDaily = days > 0 ? total / days : 0;
    const previousTotal = await this.previousRangeTotal(familyId, range, now);
    const trendRate = previousTotal === 0
      ? records.length > 0 ? 100 : 0
      : ((total - previousTotal) / previousTotal) * 100;

    return {
      range,
      totalExpense: this.round(total),
      trendRate: Math.round(trendRate * 10) / 10,
      recordCount: records.length,
      averageDailyExpense: this.round(averageDaily),
      trendSeries: this.buildTrendSeries(records, range, now),
      categoryRatio: this.buildCategoryRatio(records),
      topExpenses: this.buildTopExpenses(records),
    };
  }

  private async loadRecords(
    familyId: string,
    range: StatisticsRange,
    now: Date,
  ): Promise<ExpenseRecord[]> {
    const since = this.rangeStart(range, now);
    const logs = await this.prisma.stockLog.findMany({
      where: {
        familyId,
        action: "STOCK_IN",
        operatedAt: { gte: since },
      },
      include: {
        product: {
          select: { name: true, image: true, category: true, archived: true, purchasePrice: true },
        },
      },
      orderBy: { operatedAt: "desc" },
    });

    return logs.map<ExpenseRecord>((log) => ({
      id: log.id,
      productId: log.productId,
      productName: log.product?.name ?? "",
      productImage: log.product?.image ?? undefined,
      productArchived: log.product?.archived,
      category: log.product?.category ?? "其他",
      amount: this.amountFor(log, log.product?.purchasePrice ?? null),
      occurredAt: log.operatedAt,
    }));
  }

  private amountFor(log: StockLog, price: { toString(): string } | null): number {
    if (log.amount !== null) return Number(log.amount);
    if (log.unitPrice !== null) return Number(log.quantity) * Number(log.unitPrice);
    if (price) return Number(log.quantity) * Number(price.toString());
    return Number(log.quantity) * 25;
  }

  private async previousRangeTotal(
    familyId: string,
    range: StatisticsRange,
    now: Date,
  ): Promise<number> {
    const since = this.previousRangeStart(range, now);
    const until = this.rangeStart(range, now);
    const logs = await this.prisma.stockLog.findMany({
      where: {
        familyId,
        action: "STOCK_IN",
        operatedAt: { gte: since, lt: until },
      },
      include: { product: { select: { purchasePrice: true } } },
    });

    return logs.reduce((sum, log) => sum + this.amountFor(log, log.product?.purchasePrice ?? null), 0);
  }

  private rangeStart(range: StatisticsRange, now: Date): Date {
    const start = new Date(now);
    if (range === "week") {
      start.setDate(start.getDate() - 6);
    } else if (range === "year") {
      start.setMonth(0, 1);
    } else {
      start.setDate(1);
    }
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private previousRangeStart(range: StatisticsRange, now: Date): Date {
    const start = this.rangeStart(range, now);
    if (range === "week") start.setDate(start.getDate() - 7);
    else if (range === "year") start.setFullYear(start.getFullYear() - 1);
    else start.setMonth(start.getMonth() - 1);
    return start;
  }

  private dayCount(range: StatisticsRange): number {
    if (range === "week") return 7;
    if (range === "year") return 365;
    return 30;
  }

  private buildTrendSeries(
    records: ExpenseRecord[],
    range: StatisticsRange,
    now: Date,
  ): StatisticsSummary["trendSeries"] {
    if (range === "year") {
      const quarters = [0, 0, 0, 0];
      for (const record of records) {
        quarters[Math.floor(record.occurredAt.getMonth() / 3)] += record.amount;
      }
      return this.normalize(quarters.map((amount, index) => ({ label: `Q${index + 1}`, amount })));
    }

    if (range === "week") {
      const buckets = new Array<{ label: string; amount: number }>(7);
      const labels = ["日", "一", "二", "三", "四", "五", "六"];
      for (let day = 0; day < 7; day += 1) {
        const date = new Date(now);
        date.setDate(now.getDate() - (6 - day));
        buckets[day] = { label: labels[date.getDay()], amount: 0 };
      }
      for (const record of records) {
        const dayDiff = Math.floor(
          (now.setHours(0, 0, 0, 0) - new Date(record.occurredAt).setHours(0, 0, 0, 0)) /
            (1000 * 60 * 60 * 24),
        );
        const bucketIndex = 6 - dayDiff;
        if (bucketIndex >= 0 && bucketIndex < 7) {
          buckets[bucketIndex].amount += record.amount;
        }
      }
      return this.normalize(buckets);
    }

    // month: per-week buckets within the current month
    const weekBuckets: Array<{ label: string; amount: number }> = [
      { label: "一", amount: 0 },
      { label: "二", amount: 0 },
      { label: "三", amount: 0 },
      { label: "四", amount: 0 },
      { label: "五", amount: 0 },
    ];
    for (const record of records) {
      const day = record.occurredAt.getDate();
      const weekIndex = Math.min(4, Math.floor((day - 1) / 7));
      weekBuckets[weekIndex].amount += record.amount;
    }
    return this.normalize(weekBuckets);
  }

  private normalize(
    buckets: Array<{ label: string; amount: number }>,
  ): StatisticsSummary["trendSeries"] {
    const max = buckets.reduce((peak, item) => Math.max(peak, item.amount), 0) || 1;
    const activeLabel = buckets.reduce(
      (top, item) => (item.amount > top.amount ? item : top),
      buckets[0],
    ).label;
    return buckets.map((bucket) => ({
      label: bucket.label,
      amount: this.round(bucket.amount),
      percent: Math.round((bucket.amount / max) * 100),
      active: bucket.label === activeLabel && bucket.amount > 0,
    }));
  }

  private buildCategoryRatio(records: ExpenseRecord[]): StatisticsSummary["categoryRatio"] {
    if (!records.length) return [];
    const totals = new Map<string, number>();
    let total = 0;

    for (const record of records) {
      totals.set(record.category, (totals.get(record.category) ?? 0) + record.amount);
      total += record.amount;
    }

    return [...totals.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([category, amount]) => ({
        category,
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
      }));
  }

  private buildTopExpenses(records: ExpenseRecord[]): StatisticsSummary["topExpenses"] {
    return [...records]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((record, index) => ({
        id: record.id,
        productId: record.productId,
        productImage: record.productImage,
        productArchived: record.productArchived,
        rank: index + 1,
        name: record.productName,
        category: record.category,
        date: `${record.occurredAt.getMonth() + 1}月${String(record.occurredAt.getDate()).padStart(2, "0")}日`,
        amount: this.round(record.amount),
      }));
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
