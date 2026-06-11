<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { computed } from "vue";
import { storeToRefs } from "pinia";
import AppTabBar from "@/components/AppTabBar.vue";
import PetPawMark from "@/components/PetPawMark.vue";
import { fetchProducts } from "@/services/inventoryApi";
import { useDashboardStore } from "@/stores";
import type { DashboardSummary } from "@family-inventory/shared-types";

const PENDING_INVENTORY_FILTER_KEY = "fi:inventory:pending_filter";
const HOME_ALERT_ORDER = ["expiring", "warning", "restock"];
type DashboardAlert = DashboardSummary["alerts"][number];
const dashboardStore = useDashboardStore();
const { dashboard } = storeToRefs(dashboardStore);
const visibleAlerts = computed<DashboardAlert[]>(() =>
  HOME_ALERT_ORDER
    .map((id) => dashboard.value.alerts.find((alert) => alert.id === id))
    .filter((alert): alert is DashboardAlert => Boolean(alert)),
);

const actions = [
  { id: "scan", label: "扫码入库", icon: "scan", tone: "blue" },
  { id: "manual", label: "手动添加", icon: "add-circle", tone: "purple" },
  { id: "out", label: "出库消耗", icon: "minus-circle", tone: "orange" },
  { id: "list", label: "购物清单", icon: "list", tone: "yellow" },
];

onShow(() => {
  void loadDashboard();
});

async function loadDashboard() {
  try {
    await dashboardStore.refresh();
  } catch {
    uni.showToast({ title: "首页数据加载失败", icon: "none" });
  }
}

async function onQuickAction(id: string) {
  if (id === "scan") {
    uni.navigateTo({ url: "/pages/stock-in/stock-in" });
    return;
  }

  if (id === "manual") {
    uni.switchTab({ url: "/pages/add/add" });
    return;
  }

  if (id === "out") {
    await goConsumeProduct();
    return;
  }

  if (id === "list") {
    uni.navigateTo({ url: "/pages/restock/restock" });
  }
}

async function goConsumeProduct() {
  try {
    const products = (await fetchProducts()).items;
    const product = products.find((item) => item.quantity > 0);

    if (product) {
      uni.navigateTo({
        url: `/pages/product-detail/product-detail?id=${encodeURIComponent(product.id)}&consume=1`,
      });
      return;
    }
  } catch {
    uni.showToast({ title: "库存加载失败", icon: "none" });
    return;
  }

  uni.setStorageSync(PENDING_INVENTORY_FILTER_KEY, { status: "enough" });
  uni.switchTab({ url: "/pages/inventory/inventory" });
  uni.showToast({ title: "请选择要出库的商品", icon: "none" });
}

function goInventory(category?: string) {
  if (category) {
    uni.setStorageSync(PENDING_INVENTORY_FILTER_KEY, { category });
  } else {
    uni.removeStorageSync(PENDING_INVENTORY_FILTER_KEY);
  }

  uni.switchTab({ url: "/pages/inventory/inventory" });
}

function goReminders() {
  uni.navigateTo({ url: "/pages/reminders/reminders" });
}

function onAlert(id: string) {
  if (id === "restock") {
    uni.navigateTo({ url: "/pages/restock/restock" });
    return;
  }

  if (id === "warning") {
    uni.navigateTo({ url: "/pages/reminders/reminders?category=stock" });
    return;
  }

  uni.navigateTo({ url: "/pages/reminders/reminders?category=soon" });
}

function getProgressWidth(days: number) {
  // Max out at 100% for 60 days
  const percentage = Math.min((days / 60) * 100, 100);
  return `${percentage}%`;
}
</script>

<template>
  <view class="home-page">
    <view class="topbar">
      <view class="topbar-brand">
        <view class="paw-icon-bg">
          <PetPawMark />
        </view>
      </view>
      <text class="topbar-title">宠物管家</text>
      <button class="topbar-icon" @click="goReminders">
        <wd-icon name="notification" size="44rpx" />
      </button>
    </view>

    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <!-- Greeting Card -->
      <view class="greeting-card">
        <view>
          <view class="eyebrow">{{ dashboard.greeting }}</view>
          <view class="family-title">{{ dashboard.familyName }}</view>
        </view>
        <view class="avatar-container">
          <image class="cat-avatar" :src="dashboard.avatar" mode="aspectFill" />
          <view class="online-dot"></view>
        </view>
      </view>

      <!-- Alert Grid -->
      <view class="alert-grid">
        <view
          v-for="alert in visibleAlerts"
          :key="alert.id"
          class="alert-card active-scale"
          :class="`tone-${alert.tone}`"
          @click="onAlert(alert.id)"
        >
          <view class="alert-row">
            <wd-icon :name="alert.icon" size="36rpx" />
            <text class="alert-count">{{ alert.count }}</text>
          </view>
          <text class="alert-title">{{ alert.title }}</text>
        </view>
      </view>

      <!-- Quick Actions -->
      <view class="section-head">
        <text>快捷操作</text>
      </view>
      <view class="action-grid">
        <button
          v-for="action in actions"
          :key="action.id"
          class="action-card active-scale"
          @click="onQuickAction(action.id)"
        >
          <view class="action-icon" :class="`bg-${action.tone}`">
            <wd-icon :name="action.icon" size="40rpx" :class="`text-${action.tone}`" />
          </view>
          <text class="action-label">{{ action.label }}</text>
        </button>
      </view>

      <!-- Category Overview -->
      <view class="section-head has-link">
        <text>分类总览</text>
        <button @click="goInventory()" class="view-all-btn">查看全部</button>
      </view>
      
      <view class="category-list">
        <button
          v-for="category in dashboard.categories"
          :key="category.id"
          class="category-card active-scale"
          @click="goInventory(category.id)"
        >
          <view class="category-top">
            <view class="category-left">
              <view class="category-icon" :class="`bg-${category.tone}`">
                <wd-icon :name="category.icon" size="60rpx" :class="`text-${category.tone}`" />
              </view>
              <view class="category-info">
                <text class="category-name">{{ category.name }}</text>
                <text class="muted">总数量</text>
              </view>
            </view>
            <view class="category-right">
              <view class="category-number">
                {{ category.total }}
                <text>{{ category.unit }}</text>
              </view>
            </view>
          </view>
          
          <view class="category-progress-container">
            <view class="progress-labels">
              <text class="progress-status muted">
                {{ category.days > 14 ? '库存充足' : '低库存提醒' }}
              </text>
              <view class="progress-days-col">
                <text class="progress-days-label">预计可用</text>
                <text class="progress-days-value" :class="category.days > 14 ? 'text-success' : 'text-warning'">约{{ category.days }}天</text>
              </view>
            </view>
            <view class="progress-track">
              <view 
                class="progress-bar" 
                :class="category.days > 14 ? 'bg-success' : 'bg-warning'"
                :style="{ width: getProgressWidth(category.days) }"
              ></view>
            </view>
          </view>
        </button>
      </view>
    </scroll-view>
    <AppTabBar active="home" />
  </view>
</template>

<style lang="scss" scoped>
.home-page {
  min-height: 100vh;
  background: $color-bg-page;
  overflow-x: hidden;
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
  background: transparent;
  color: $color-text-primary;
}

.topbar-title {
  font-size: 36rpx;
  font-weight: $font-weight-bold;
  line-height: 50rpx;
  letter-spacing: 2rpx;
  text-align: center;
}

.paw-icon-bg {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFF0F5;
  border-radius: 50%;
  color: $color-primary;
}

.topbar-icon {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border-radius: 50%;
  color: $color-text-primary;
  box-shadow: $shadow-sm;
}

.content {
  height: calc(100vh - 96rpx);
  width: 100%;
  padding: 24rpx 32rpx calc(148rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  overflow: hidden;
}

.greeting-card {
  min-height: 180rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 40rpx 48rpx;
  border-radius: 48rpx;
  background: #ffffff;
  box-shadow: $shadow-sm;
}

.eyebrow {
  font-size: 26rpx;
  line-height: 36rpx;
  color: $color-text-secondary;
}

.family-title {
  margin-top: 8rpx;
  font-size: 44rpx;
  font-weight: $font-weight-bold;
  line-height: 56rpx;
  color: $color-text-primary;
}

.avatar-container {
  position: relative;
}

.cat-avatar {
  width: 120rpx;
  height: 120rpx;
  border: 4rpx solid $color-primary;
  border-radius: $radius-full;
}

.online-dot {
  position: absolute;
  right: 6rpx;
  bottom: 6rpx;
  width: 24rpx;
  height: 24rpx;
  background-color: $color-success;
  border: 4rpx solid #ffffff;
  border-radius: 50%;
}

.alert-grid {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  margin: 40rpx 0 0;
}

.alert-card {
  flex: 1;
  min-width: 0;
  height: 140rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 8rpx;
  border-radius: 32rpx;
}

.alert-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
}

.alert-count {
  font-size: 38rpx;
  font-weight: $font-weight-bold;
  line-height: 46rpx;
}

.alert-title {
  font-size: 24rpx;
  font-weight: $font-weight-bold;
  line-height: 32rpx;
}

.tone-danger {
  background: $color-pastel-pink;
  color: $color-pastel-pink-text;
}

.tone-warning {
  background: $color-pastel-yellow;
  color: $color-pastel-yellow-text;
}

.tone-info {
  background: $color-pastel-purple;
  color: $color-pastel-purple-text;
}

.section-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 50rpx 0 30rpx;
  font-size: 36rpx;
  font-weight: $font-weight-bold;
  line-height: 48rpx;
  color: $color-text-primary;
}

.section-head.has-link {
  gap: 24rpx;
}

.section-head.has-link text {
  flex: 1;
  min-width: 0;
}

.view-all-btn {
  width: auto;
  min-width: 140rpx;
  height: 56rpx;
  flex: 0 0 auto;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 127, 80, 0.1);
  font-size: 28rpx;
  font-weight: $font-weight-medium;
  line-height: 1;
  color: $color-primary;
}

.action-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24rpx;
}

.action-card {
  width: 100%;
  max-width: none;
  min-width: 0;
  height: 160rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  margin: 0;
  padding: 0 24rpx;
  border-radius: 40rpx;
  background: #ffffff;
  box-shadow: $shadow-sm;
  line-height: normal;
  appearance: none;
}

.action-card::after {
  border: 0;
}

.action-icon,
.category-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 32rpx;
}

.action-icon {
  width: 80rpx;
  height: 80rpx;
}

.action-label {
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.category-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 40rpx;
  border-radius: 64rpx;
  background: #ffffff;
  border: 2rpx solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 20rpx 50rpx -10rpx rgba(0, 0, 0, 0.05), 0 16rpx 20rpx -12rpx rgba(0, 0, 0, 0.05);
  text-align: left;
  line-height: normal;
  appearance: none;
}

.category-card::after {
  border: 0;
}

.category-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 32rpx;
}

.category-left {
  display: flex;
  align-items: center;
  gap: 32rpx;
}

.category-icon {
  width: 112rpx;
  height: 112rpx;
  border-radius: 32rpx;
}

.category-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.category-name {
  font-size: 36rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
  margin-bottom: 4rpx;
}

.muted {
  font-size: 24rpx;
  color: $color-text-tertiary;
}

.category-right {
  display: flex;
  align-items: baseline;
}

.category-number {
  font-size: 48rpx;
  font-weight: $font-weight-bold;
  line-height: 1;
  color: $color-text-primary;
}

.category-number text {
  margin-left: 8rpx;
  font-size: 24rpx;
  font-weight: $font-weight-medium;
  color: $color-text-secondary;
}

.category-progress-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.progress-status {
  font-size: 24rpx;
  color: $color-text-secondary;
}

.progress-days-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.progress-days-label {
  font-size: 20rpx;
  color: $color-text-tertiary;
  text-transform: uppercase;
  letter-spacing: 1rpx;
}

.progress-days-value {
  font-size: 28rpx;
  font-weight: $font-weight-bold;
}

.progress-track {
  width: 100%;
  height: 16rpx;
  background: #F1F5F9;
  border-radius: 999rpx;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 999rpx;
  transition: width 0.3s ease;
}

// Utility background/text classes for pastel tones
.bg-blue { background: $color-pastel-blue; }
.text-blue { color: $color-pastel-blue-text; }
.bg-purple { background: $color-pastel-purple; }
.text-purple { color: $color-pastel-purple-text; }
.bg-orange { background: #FFF5F0; }
.text-orange { color: #FF7F50; }
.bg-yellow { background: $color-pastel-yellow; }
.text-yellow { color: $color-pastel-yellow-text; }
.bg-pink { background: $color-pastel-pink; }
.text-pink { color: $color-pastel-pink-text; }
.bg-green { background: $color-pastel-green; }
.text-green { color: $color-pastel-green-text; }

.bg-success { background: $color-success; }
.text-success { color: $color-success; }
.bg-warning { background: $color-warning; }
.text-warning { color: $color-warning; }

// Tone mapping overrides for categories since they use tone from data
.bg-tone-mint { background: $color-pastel-blue; }
.text-tone-mint { color: $color-pastel-blue-text; }
.bg-tone-lake { background: #EEF2FF; }
.text-tone-lake { color: #6366F1; }
.bg-tone-rose { background: #FDF2F8; }
.text-tone-rose { color: #EC4899; }
.bg-tone-yellow { background: #FFFBEB; }
.text-tone-yellow { color: #F59E0B; }

</style>

