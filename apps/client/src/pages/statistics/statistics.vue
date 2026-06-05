<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import type { StatisticsRange, StatisticsSummary } from "@family-inventory/shared-types";
import AppTabBar from "@/components/AppTabBar.vue";
import { fetchStatistics } from "@/services/inventoryApi";
import { fallbackStatistics } from "@/services/fallbackData";

const activeRange = ref<StatisticsRange>("month");
const statistics = ref(fallbackStatistics);
const isLoading = ref(false);

const ranges: Array<{ id: StatisticsRange; label: string }> = [
  { id: "week", label: "本周" },
  { id: "month", label: "本月" },
  { id: "year", label: "本年" },
];

const donutColors = ["#006C49", "#FFE066", "#005CBA", "#DFF8FB"];

const visibleRatios = computed(() => statistics.value.categoryRatio.slice(0, 3));
const bars = computed(() =>
  statistics.value.trendSeries.map((item) => ({
    ...item,
    height: item.percent,
  })),
);
const periodLabel = computed(() => ranges.find((range) => range.id === activeRange.value)?.label ?? "本月");
const trendTone = computed(() => {
  if (statistics.value.trendRate > 0) return "up";
  if (statistics.value.trendRate < 0) return "down";
  return "flat";
});
const trendIcon = computed(() => {
  if (trendTone.value === "up") return "arrow-up";
  if (trendTone.value === "down") return "arrow-down";
  return "minus-circle";
});
const donutStyle = computed(() => {
  const ratios = statistics.value.categoryRatio.length
    ? statistics.value.categoryRatio
    : [{ category: "其他", percent: 100 }];
  let start = 0;
  const segments: string[] = [];

  ratios.slice(0, 3).forEach((ratio, index) => {
    const end = Math.min(100, start + clampPercent(ratio.percent));

    if (end > start) {
      segments.push(`${donutColors[index]} ${start}% ${end}%`);
      start = end;
    }
  });

  if (start < 100) {
    segments.push(`${donutColors[3]} ${start}% 100%`);
  }

  return {
    background: `conic-gradient(${segments.join(", ")})`,
  };
});
const chartNote = computed(() => {
  const activeBar = bars.value.find((bar) => bar.active && bar.amount > 0);

  if (!activeBar) return "暂无支出趋势";
  if (activeRange.value === "year") return `${activeBar.label} 支出最高`;
  return `周${activeBar.label}出现消费峰值`;
});
const insightText = computed(() => {
  const topCategory = statistics.value.categoryRatio[0]?.category ?? "主粮";

  if (activeRange.value === "week") {
    return `本周「${topCategory}」占比最高，建议结合剩余库存安排下一次补货。`;
  }

  if (activeRange.value === "year") {
    return `今年「${topCategory}」仍是主要支出，医疗与用品支出适合按季度复盘。`;
  }

  return `本月「${topCategory}」支出较上月增加，建议关注余粮情况；「零食」支出明显下降，控糖计划执行良好。`;
});

const topExpenses = computed(() =>
  statistics.value.topExpenses
    .slice(0, 5)
    .map((item, index) => ({
      ...item,
      meta: `${item.category} · ${item.date}`,
      amountText: formatMoney(item.amount),
      image: item.productImage ?? (index === 0 ? "/static/products/orijen.png" : undefined),
      icon: index === 1 ? "scan" : "edit",
      tone: index === 0 ? "gold" : index === 1 ? "blue" : "rose",
    })),
);

onShow(() => {
  uni.hideTabBar({ animation: false });
  void loadStatistics(activeRange.value);
});

function formatMoney(value: number) {
  return `¥ ${value.toFixed(2)}`;
}

function formatTotal(value: number) {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSignedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function ratioLegendClass(index: number) {
  return ["primary", "yellow", "blue"][index] ?? "muted";
}

async function loadStatistics(range: StatisticsRange) {
  if (isLoading.value) return;

  isLoading.value = true;

  try {
    statistics.value = await fetchStatistics(range);
    activeRange.value = statistics.value.range;
  } catch {
    activeRange.value = statistics.value.range;
    uni.showToast({ title: "统计数据加载失败", icon: "none" });
  } finally {
    isLoading.value = false;
  }
}

function selectRange(range: StatisticsRange) {
  if (activeRange.value === range && !isLoading.value) return;

  activeRange.value = range;
  void loadStatistics(range);
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: "/pages/home/home" }),
  });
}

function goRecords() {
  uni.navigateTo({ url: "/pages/records/records" });
}

function openTopExpense(item: StatisticsSummary["topExpenses"][number]) {
  if (!item.productId) {
    goRecords();
    return;
  }

  if (item.productArchived) {
    uni.showToast({ title: "商品已归档，历史记录已保留", icon: "none" });
    return;
  }

  uni.navigateTo({
    url: `/pages/product-detail/product-detail?id=${encodeURIComponent(item.productId)}`,
  });
}

function exportReport() {
  uni.setClipboardData({
    data: buildReportText(),
    success: () => uni.showToast({ title: "报表已复制", icon: "success" }),
    fail: () => uni.showToast({ title: "报表复制失败", icon: "none" }),
  });
}

function buildReportText() {
  const topLines = statistics.value.topExpenses.map(
    (item) => `${item.rank}. ${item.name} ${formatMoney(item.amount)} (${item.category} ${item.date})`,
  );

  return [
    `${periodLabel.value}家庭库存支出报表`,
    `总支出: ${formatMoney(statistics.value.totalExpense)}`,
    `记录数: ${statistics.value.recordCount} 笔`,
    `日均支出: ${formatMoney(statistics.value.averageDailyExpense)}`,
    `趋势: ${formatSignedPercent(statistics.value.trendRate)}`,
    "Top 支出:",
    ...topLines,
  ].join("\n");
}
</script>

<template>
  <view class="statistics-page">
    <view class="topbar">
      <button class="topbar-button" @click="goBack">
        <wd-icon name="arrow-left" size="42rpx" />
      </button>
      <text class="topbar-title">数据洞察</text>
      <button class="topbar-button right" @click="exportReport">
        <wd-icon name="download" size="42rpx" />
      </button>
    </view>

    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <view class="range-tabs">
        <button
          v-for="range in ranges"
          :key="range.id"
          class="range-tab"
          :class="{ active: activeRange === range.id }"
          :disabled="isLoading"
          @click="selectRange(range.id)"
        >
          {{ range.label }}
        </button>
      </view>

      <view class="expense-card">
        <view class="card-accent" />
        <view class="expense-head">
          <view>
            <view class="muted">{{ periodLabel }}总支出 (¥)</view>
            <view class="expense-amount">{{ formatTotal(statistics.totalExpense) }}</view>
          </view>
          <view class="trend-pill" :class="trendTone">
            <wd-icon :name="trendIcon" size="20rpx" />
            <text>{{ formatSignedPercent(statistics.trendRate) }}</text>
          </view>
        </view>

        <view class="divider" />

        <view class="expense-meta">
          <view class="meta-item">
            <view class="meta-icon mint">
              <wd-icon name="list" size="30rpx" />
            </view>
            <view>
              <view class="meta-label">记账笔数</view>
              <view class="meta-value">{{ statistics.recordCount }} 笔</view>
            </view>
          </view>

          <view class="meta-item right">
            <view class="meta-icon lake">
              <wd-icon name="cart" size="30rpx" />
            </view>
            <view>
              <view class="meta-label">日均支出</view>
              <view class="meta-value">{{ formatMoney(statistics.averageDailyExpense) }}</view>
            </view>
          </view>
        </view>
      </view>

      <view class="insight-card">
        <wd-icon name="tips" size="42rpx" />
        <view>
          <view class="insight-title">智能洞察</view>
          <view class="insight-text">{{ insightText }}</view>
        </view>
      </view>

      <view class="chart-grid">
        <view class="chart-card">
          <view class="chart-title">分类占比</view>
          <view class="donut-wrap">
            <view class="donut" :style="donutStyle">
              <view class="donut-hole" />
            </view>
            <view class="donut-center">
              <text>最大头</text>
              <text>{{ statistics.categoryRatio[0]?.category }}</text>
            </view>
          </view>
          <view class="legend">
            <view
              v-for="(ratio, index) in visibleRatios"
              :key="ratio.category"
              class="legend-row"
            >
              <view class="legend-dot" :class="ratioLegendClass(index)" />
              <text>{{ ratio.category }}</text>
              <text>{{ ratio.percent }}%</text>
            </view>
          </view>
        </view>

        <view class="chart-card">
          <view class="chart-title">支出趋势</view>
          <view class="bars">
            <view v-for="bar in bars" :key="bar.label" class="bar-column">
              <view
                class="bar"
                :class="{ active: bar.active }"
                :style="{ height: `${bar.height}%` }"
              />
              <text :class="{ active: bar.active }">{{ bar.label }}</text>
            </view>
          </view>
          <view class="chart-note">{{ chartNote }}</view>
        </view>
      </view>

      <view class="top-card">
        <view class="top-card-head">
          <text>单笔支出 Top 5</text>
          <button @click="goRecords">查看全部 <wd-icon name="arrow-right" size="24rpx" /></button>
        </view>

        <view class="expense-list">
          <view v-for="item in topExpenses" :key="item.id" class="expense-row" @click="openTopExpense(item)">
            <view class="rank" :class="item.tone">{{ item.rank }}</view>
            <image v-if="item.image" class="row-image" :src="item.image" mode="aspectFill" />
            <view v-else class="row-icon" :class="item.tone">
              <wd-icon :name="item.icon" size="38rpx" />
            </view>
            <view class="row-main">
              <view class="row-title">{{ item.name }}</view>
              <view class="row-meta">{{ item.meta }}</view>
            </view>
            <view class="row-amount">{{ item.amountText }}</view>
          </view>
        </view>
      </view>
    </scroll-view>

    <AppTabBar active="statistics" />
  </view>
</template>

<style lang="scss" scoped>
.statistics-page {
  min-height: 100vh;
  background: $color-bg-page;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: $z-sticky;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  background: $color-bg-page;
  color: $color-primary;
}

.topbar-button {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: $color-primary;
}

.topbar-button.right {
  justify-content: flex-end;
}

.topbar-title {
  font-size: 48rpx;
  font-weight: $font-weight-bold;
  line-height: 60rpx;
  letter-spacing: 0;
}

.content {
  box-sizing: border-box;
  height: calc(100vh - 96rpx);
  padding: 32rpx 32rpx 230rpx;
}

.range-tabs {
  height: 72rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 8rpx;
  border-radius: 16rpx;
  background: #dff8fb;
}

.range-tab {
  height: 54rpx;
  flex: 1;
  border-radius: 8rpx;
  color: $color-text-primary;
  font-size: 28rpx;
  font-weight: $font-weight-medium;
  line-height: 36rpx;
}

.range-tab.active {
  background: #ffffff;
  color: $color-primary;
  box-shadow: 0 2rpx 8rpx rgba(21, 61, 53, 0.1);
}

.expense-card,
.chart-card,
.top-card {
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: $shadow-md;
}

.expense-card {
  position: relative;
  margin-top: 40rpx;
  padding: 32rpx;
  overflow: hidden;
}

.card-accent {
  position: absolute;
  top: 0;
  right: 0;
  width: 178rpx;
  height: 178rpx;
  border-radius: 0 0 0 178rpx;
  background: rgba(24, 185, 129, 0.06);
}

.expense-head,
.expense-meta {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
}

.muted {
  color: $color-text-secondary;
  font-size: 26rpx;
  line-height: 34rpx;
}

.expense-amount {
  margin-top: 16rpx;
  font-size: 52rpx;
  font-weight: $font-weight-bold;
  line-height: 62rpx;
  color: $color-text-primary;
}

.trend-pill {
  height: 44rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 0 18rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.trend-pill.down {
  background: $color-primary-bg;
  color: $color-success;
}

.trend-pill.up {
  background: $color-danger-bg;
  color: $color-danger;
}

.trend-pill.flat {
  background: $color-bg-muted;
  color: $color-text-secondary;
}

.divider {
  height: 2rpx;
  margin: 34rpx 0 28rpx;
  background: $color-border;
}

.expense-meta {
  align-items: center;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.meta-item.right {
  text-align: right;
}

.meta-icon {
  width: 58rpx;
  height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
}

.meta-icon.mint {
  background: $color-primary-bg;
  color: $color-primary;
}

.meta-icon.lake {
  background: $color-accent-bg;
  color: $color-accent;
}

.meta-label {
  color: $color-text-secondary;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
  line-height: 32rpx;
}

.meta-value {
  margin-top: 4rpx;
  color: $color-text-primary;
  font-size: 26rpx;
  font-weight: $font-weight-bold;
}

.insight-card {
  display: flex;
  gap: 24rpx;
  margin-top: 40rpx;
  padding: 32rpx;
  border: 2rpx solid rgba(24, 185, 129, 0.24);
  border-radius: 24rpx;
  background: $color-primary-bg;
  color: $color-primary;
}

.insight-title {
  font-size: 28rpx;
  font-weight: $font-weight-bold;
  line-height: 38rpx;
}

.insight-text {
  margin-top: 10rpx;
  font-size: 26rpx;
  line-height: 42rpx;
  color: $color-primary-dark;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24rpx;
  margin-top: 40rpx;
}

.chart-card {
  min-height: 448rpx;
  padding: 32rpx;
}

.chart-title {
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  line-height: 40rpx;
  color: $color-text-primary;
}

.donut-wrap {
  position: relative;
  width: 210rpx;
  height: 210rpx;
  margin: 42rpx auto 32rpx;
}

.donut {
  position: relative;
  width: 210rpx;
  height: 210rpx;
  border-radius: $radius-full;
  background: #dff8fb;
}

.donut-hole {
  position: absolute;
  inset: 34rpx;
  border-radius: $radius-full;
  background: #ffffff;
}

.donut-center {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.donut-center text:first-child {
  font-size: 22rpx;
  color: $color-text-secondary;
}

.donut-center text:last-child {
  margin-top: 4rpx;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  color: $color-primary;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 14rpx;
  font-size: 24rpx;
  color: $color-text-secondary;
}

.legend-row text:last-child {
  margin-left: auto;
  color: $color-text-primary;
  font-weight: $font-weight-bold;
}

.legend-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: $radius-full;
}

.legend-dot.primary {
  background: $color-primary;
}

.legend-dot.yellow {
  background: $color-accent-yellow;
}

.legend-dot.blue {
  background: $color-accent;
}

.legend-dot.muted {
  background: #dff8fb;
}

.bars {
  height: 206rpx;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 14rpx;
  margin-top: 44rpx;
}

.bar-column {
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 12rpx;
}

.bar {
  width: 100%;
  min-height: 24rpx;
  border-radius: 6rpx 6rpx 0 0;
  background: $color-primary-bg;
}

.bar.active {
  background: $color-primary;
}

.bar-column text {
  font-size: 20rpx;
  color: $color-text-secondary;
}

.bar-column text.active {
  color: $color-primary;
  font-weight: $font-weight-bold;
}

.chart-note {
  margin-top: 28rpx;
  padding-top: 22rpx;
  border-top: 2rpx solid $color-border;
  font-size: 22rpx;
  color: $color-text-secondary;
}

.top-card {
  margin-top: 40rpx;
  padding: 32rpx;
}

.top-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.top-card-head > text {
  font-size: 34rpx;
  font-weight: $font-weight-bold;
  line-height: 44rpx;
}

.top-card-head button {
  display: flex;
  align-items: center;
  gap: 4rpx;
  color: $color-primary;
  font-size: 24rpx;
  font-weight: $font-weight-medium;
}

.expense-list {
  margin-top: 26rpx;
}

.expense-row {
  min-height: 100rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 18rpx 0;
  border-bottom: 2rpx solid rgba(229, 231, 235, 0.7);
}

.expense-row:last-child {
  border-bottom: 0;
}

.rank {
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 44rpx;
  border-radius: 10rpx;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.rank.gold {
  background: #fff0d9;
  color: $color-warning;
}

.rank.blue,
.rank.rose {
  background: #d9eff0;
  color: $color-text-secondary;
}

.row-image,
.row-icon {
  width: 60rpx;
  height: 60rpx;
  flex: 0 0 60rpx;
  border-radius: 14rpx;
}

.row-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.row-icon.blue {
  background: $color-accent-bg;
  color: $color-accent;
}

.row-icon.rose {
  background: $color-danger-bg;
  color: $color-danger;
}

.row-main {
  min-width: 0;
  flex: 1;
}

.row-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 27rpx;
  font-weight: $font-weight-medium;
  line-height: 36rpx;
  color: $color-text-primary;
}

.row-meta {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: $color-text-secondary;
}

.row-amount {
  font-size: 28rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}
</style>
