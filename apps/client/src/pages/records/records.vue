<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import type { ProductStockLogSummary } from "@family-inventory/shared-types";
import { fetchStockLogs } from "@/services/inventoryApi";

type RecordFilter = "all" | "stock_in" | "stock_out" | "adjust";

const logs = ref<ProductStockLogSummary[]>([]);
const activeFilter = ref<RecordFilter>("all");
const isLoading = ref(true);

const filters: Array<{ id: RecordFilter; label: string }> = [
  { id: "all", label: "全部" },
  { id: "stock_in", label: "入库" },
  { id: "stock_out", label: "出库" },
  { id: "adjust", label: "调整" },
];

const filteredLogs = computed(() => logs.value.filter(matchesFilter));
const stockInCount = computed(() => logs.value.filter((log) => log.action === "stock_in").length);
const stockOutCount = computed(() =>
  logs.value.filter((log) => ["stock_out", "expired", "gift"].includes(log.action)).length,
);

onShow(() => {
  uni.hideTabBar({ animation: false });
  void loadLogs();
});

async function loadLogs() {
  isLoading.value = true;

  try {
    logs.value = (await fetchStockLogs()).items;
  } catch {
    uni.showToast({ title: "记录加载失败", icon: "none" });
  } finally {
    isLoading.value = false;
  }
}

function matchesFilter(log: ProductStockLogSummary) {
  if (activeFilter.value === "all") return true;
  if (activeFilter.value === "stock_out") return ["stock_out", "expired", "gift"].includes(log.action);
  return log.action === activeFilter.value;
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: "/pages/profile/profile" }),
  });
}

function goProduct(log: ProductStockLogSummary) {
  if (log.productArchived) {
    uni.showToast({ title: "商品已归档，历史记录已保留", icon: "none" });
    return;
  }

  uni.navigateTo({ url: `/pages/product-detail/product-detail?id=${encodeURIComponent(log.productId)}` });
}

function formatQuantity(log: ProductStockLogSummary) {
  if (log.actionText === "商品归档" && log.quantity === 0) {
    return "已归档";
  }

  const prefix = log.action === "stock_in" ? "+" : "-";
  return `${prefix}${log.quantity} ${log.unit}`;
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${month}.${day} ${hour}:${minute}`;
}
</script>

<template>
  <view class="records-page">
    <view class="topbar">
      <button class="icon-button" @click="goBack">
        <wd-icon name="arrow-left" size="42rpx" />
      </button>
      <text class="topbar-title">使用记录</text>
      <button class="icon-button right" @click="loadLogs">
        <wd-icon name="refresh" size="40rpx" />
      </button>
    </view>

    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <view class="summary-card">
        <view>
          <text class="summary-value">{{ logs.length }}</text>
          <text class="summary-label">全部记录</text>
        </view>
        <view>
          <text class="summary-value stock-in">{{ stockInCount }}</text>
          <text class="summary-label">入库</text>
        </view>
        <view>
          <text class="summary-value stock-out">{{ stockOutCount }}</text>
          <text class="summary-label">出库</text>
        </view>
      </view>

      <view class="filter-card">
        <button
          v-for="filter in filters"
          :key="filter.id"
          class="filter-chip"
          :class="{ active: activeFilter === filter.id }"
          @click="activeFilter = filter.id"
        >
          {{ filter.label }}
        </button>
      </view>

      <view v-if="isLoading" class="empty-state">加载中...</view>
      <view v-else-if="!filteredLogs.length" class="empty-state">
        <wd-icon name="check-circle" size="68rpx" />
        <text>暂无记录</text>
      </view>

      <view v-else class="record-list">
        <view
          v-for="log in filteredLogs"
          :key="log.id"
          class="record-card"
          @click="goProduct(log)"
        >
          <image
            v-if="log.productImage"
            class="record-image"
            :src="log.productImage"
            mode="aspectFit"
          />
          <view v-else class="record-image icon-only">
            <wd-icon name="list" size="42rpx" />
          </view>

          <view class="record-main">
            <view class="record-title">{{ log.productName || "库存商品" }}</view>
            <view class="record-meta">{{ log.actionText }} · {{ formatTime(log.operatedAt) }}</view>
            <view v-if="log.notes" class="record-notes">{{ log.notes }}</view>
          </view>

          <view class="record-side">
            <text class="record-quantity" :class="log.action">{{ formatQuantity(log) }}</text>
            <text class="record-operator">{{ log.operatorName }}</text>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style lang="scss" scoped>
.records-page {
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
  padding: 0 34rpx;
  background: $color-bg-page;
}

.icon-button {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: $color-primary;
}

.icon-button.right {
  justify-content: flex-end;
}

.topbar-title {
  font-size: 48rpx;
  font-weight: $font-weight-bold;
  line-height: 60rpx;
  color: $color-primary;
}

.content {
  height: calc(100vh - 96rpx);
  padding: 28rpx 32rpx 72rpx;
}

.summary-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20rpx;
  padding: 30rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: $shadow-md;
}

.summary-card > view {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-value {
  font-size: 46rpx;
  font-weight: $font-weight-bold;
  line-height: 54rpx;
  color: $color-primary;
}

.summary-value.stock-in {
  color: $color-success;
}

.summary-value.stock-out {
  color: $color-warning;
}

.summary-label {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $color-text-secondary;
}

.filter-card {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8rpx;
  margin-top: 30rpx;
  padding: 8rpx;
  border: 2rpx solid $color-border;
  border-radius: 16rpx;
  background: #ffffff;
}

.filter-chip {
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: transparent;
  color: $color-text-secondary;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.filter-chip.active {
  background: $color-primary;
  color: #ffffff;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
  margin-top: 36rpx;
}

.record-card {
  min-height: 132rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: $shadow-sm;
}

.record-image {
  width: 86rpx;
  height: 86rpx;
  flex: 0 0 86rpx;
  border-radius: 16rpx;
  background: $color-primary-bg;
}

.record-image.icon-only {
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-primary;
}

.record-main {
  min-width: 0;
  flex: 1;
}

.record-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  line-height: 40rpx;
  color: $color-text-primary;
}

.record-meta,
.record-notes,
.record-operator {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: $color-text-secondary;
}

.record-notes {
  color: $color-text-primary;
}

.record-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex: 0 0 auto;
}

.record-quantity {
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  color: $color-primary;
}

.record-quantity.stock_out,
.record-quantity.adjust,
.record-quantity.expired,
.record-quantity.gift {
  color: $color-warning;
}

.empty-state {
  min-height: 420rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  color: $color-text-secondary;
  font-size: 28rpx;
}
</style>
