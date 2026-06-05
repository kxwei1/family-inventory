<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import { ref } from "vue";
import AppTabBar from "@/components/AppTabBar.vue";
import PetPawMark from "@/components/PetPawMark.vue";
import { fetchDashboard, fetchProducts } from "@/services/inventoryApi";
import { fallbackDashboard } from "@/services/fallbackData";

const PENDING_INVENTORY_FILTER_KEY = "fi:inventory:pending_filter";
const dashboard = ref(fallbackDashboard);

const actions = [
  { id: "scan", label: "扫码入库", icon: "scan", tone: "mint" },
  { id: "manual", label: "手动添加", icon: "add-circle", tone: "lake" },
  { id: "out", label: "出库消耗", icon: "minus-circle", tone: "rose" },
  { id: "list", label: "购物清单", icon: "list", tone: "yellow" },
];

onShow(() => {
  uni.hideTabBar({ animation: false });
  void loadDashboard();
});

async function loadDashboard() {
  try {
    dashboard.value = await fetchDashboard();
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
</script>

<template>
  <view class="home-page">
    <view class="topbar">
      <view class="topbar-brand">
        <PetPawMark />
      </view>
      <text class="topbar-title">宠物管家</text>
      <button class="topbar-icon" @click="goReminders">
        <wd-icon name="notification" size="48rpx" />
      </button>
    </view>

    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <view class="greeting-card">
        <view>
          <view class="eyebrow">{{ dashboard.greeting }}</view>
          <view class="family-title">{{ dashboard.familyName }}</view>
        </view>
        <image class="cat-avatar" :src="dashboard.avatar" mode="aspectFill" />
      </view>

      <scroll-view class="alert-scroll" scroll-x :show-scrollbar="false">
        <view
          v-for="alert in dashboard.alerts"
          :key="alert.id"
          class="alert-card"
          :class="`tone-${alert.tone}`"
          @click="onAlert(alert.id)"
        >
          <view class="alert-row">
            <wd-icon :name="alert.icon" size="48rpx" />
            <text class="alert-count">{{ alert.count }}</text>
          </view>
          <text class="alert-title">{{ alert.title }}</text>
          <wd-icon class="alert-watermark" :name="alert.icon" size="128rpx" />
        </view>
      </scroll-view>

      <view class="section-head">
        <text>快捷操作</text>
      </view>
      <view class="action-grid">
        <button
          v-for="action in actions"
          :key="action.id"
          class="action-card"
          @click="onQuickAction(action.id)"
        >
          <view class="action-icon" :class="`tone-${action.tone}`">
            <wd-icon :name="action.icon" size="48rpx" />
          </view>
          <text class="action-label">{{ action.label }}</text>
        </button>
      </view>

      <view class="section-head has-link">
        <text>分类总览</text>
        <button @click="goInventory()">查看全部</button>
      </view>
      <scroll-view class="category-scroll" scroll-x :show-scrollbar="false">
        <button
          v-for="category in dashboard.categories"
          :key="category.id"
          class="category-card"
          @click="goInventory(category.id)"
        >
          <view class="category-top">
            <view class="category-icon" :class="`tone-${category.tone}`">
              <wd-icon :name="category.icon" size="48rpx" />
            </view>
            <text class="category-name">{{ category.name }}</text>
          </view>
          <view class="category-bottom">
            <view>
              <text class="muted">总数量</text>
              <view class="category-number">
                {{ category.total }}
                <text>{{ category.unit }}</text>
              </view>
            </view>
            <view class="category-days">
              <text class="muted">预计可用</text>
              <text>{{ category.days }}</text>
            </view>
          </view>
        </button>
      </scroll-view>
    </scroll-view>

    <AppTabBar active="home" />
  </view>
</template>

<style lang="scss" scoped>
.home-page {
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

.topbar-title {
  font-size: 48rpx;
  font-weight: $font-weight-bold;
  line-height: 60rpx;
  letter-spacing: 0;
}

.topbar-brand,
.topbar-icon {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
}

.topbar-brand {
  justify-content: flex-start;
}

.topbar-icon {
  justify-content: flex-end;
  color: $color-primary;
}

.content {
  height: calc(100vh - 96rpx);
  padding: 32rpx 32rpx 220rpx;
}

.greeting-card {
  min-height: 160rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: $shadow-md;
}

.eyebrow {
  font-size: 28rpx;
  line-height: 40rpx;
  color: $color-text-secondary;
}

.family-title {
  margin-top: 6rpx;
  font-size: 38rpx;
  font-weight: $font-weight-bold;
  line-height: 50rpx;
  color: $color-text-primary;
}

.cat-avatar {
  width: 96rpx;
  height: 96rpx;
  border: 4rpx solid $color-primary-light;
  border-radius: $radius-full;
}

.alert-scroll {
  margin: 40rpx -32rpx 0;
  padding: 0 32rpx 16rpx;
  white-space: nowrap;
}

.alert-card {
  position: relative;
  width: 320rpx;
  height: 224rpx;
  display: inline-flex;
  flex-direction: column;
  justify-content: space-between;
  margin-right: 32rpx;
  padding: 32rpx;
  border-radius: 24rpx;
  overflow: hidden;
}

.alert-watermark {
  position: absolute;
  right: -22rpx;
  bottom: -28rpx;
  opacity: 0.1;
  transform: rotate(-2deg);
}

.alert-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.alert-count {
  font-size: 56rpx;
  font-weight: $font-weight-bold;
  line-height: 64rpx;
}

.alert-title {
  font-size: 24rpx;
  font-weight: $font-weight-bold;
  line-height: 32rpx;
}

.tone-danger {
  background: #fff0ed;
  color: $color-danger;
}

.tone-warning {
  background: #fffbea;
  color: $color-warning;
}

.tone-info {
  background: $color-accent-bg;
  color: $color-accent;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 40rpx 0 24rpx;
  font-size: 36rpx;
  font-weight: $font-weight-bold;
  line-height: 48rpx;
  color: $color-text-primary;
}

.section-head button {
  font-size: 26rpx;
  font-weight: $font-weight-medium;
  line-height: 34rpx;
  color: $color-primary;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24rpx;
}

.action-card {
  height: 144rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 0 32rpx;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: $shadow-md;
  text-align: left;
}

.action-icon,
.category-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
}

.action-icon {
  width: 80rpx;
  height: 80rpx;
}

.tone-mint {
  background: $color-primary-bg;
  color: $color-primary;
}

.tone-lake {
  background: $color-accent-bg;
  color: $color-accent;
}

.tone-rose {
  background: $color-danger-bg;
  color: $color-danger;
}

.tone-yellow {
  background: $color-warning-bg;
  color: $color-warning;
}

.action-label {
  min-width: 0;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  line-height: 40rpx;
  color: $color-text-primary;
}

.category-scroll {
  margin: 0 -32rpx;
  padding: 0 32rpx 20rpx;
  white-space: nowrap;
}

.category-card {
  width: 384rpx;
  height: 256rpx;
  display: inline-flex;
  flex-direction: column;
  justify-content: space-between;
  margin-right: 32rpx;
  padding: 32rpx;
  border: 2rpx solid rgba(229, 231, 235, 0.7);
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: $shadow-md;
}

.category-top {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.category-icon {
  width: 80rpx;
  height: 80rpx;
}

.category-name {
  font-size: 36rpx;
  font-weight: $font-weight-bold;
  line-height: 44rpx;
  color: $color-text-primary;
}

.category-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.muted {
  display: block;
  font-size: 24rpx;
  line-height: 32rpx;
  color: $color-text-secondary;
}

.category-number {
  margin-top: 8rpx;
  font-size: 56rpx;
  font-weight: $font-weight-bold;
  line-height: 64rpx;
  color: $color-text-primary;
}

.category-number text {
  margin-left: 6rpx;
  font-size: 24rpx;
  font-weight: $font-weight-regular;
  color: $color-text-secondary;
}

.category-days {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  color: $color-success;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  line-height: 38rpx;
}
</style>
