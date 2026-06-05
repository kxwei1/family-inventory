<script setup lang="ts">
import { computed } from "vue";

type TabKey = "home" | "inventory" | "add" | "statistics" | "reminders" | "profile";
type TabItem = {
  key: TabKey;
  label: string;
  icon: string;
  url: string;
  routeType?: "page" | "tab";
};

const props = defineProps<{
  active: TabKey;
}>();

const baseTabs: TabItem[] = [
  { key: "home", label: "首页", icon: "home", url: "/pages/home/home" },
  { key: "inventory", label: "库存", icon: "goods", url: "/pages/inventory/inventory" },
  { key: "add", label: "添加", icon: "add-circle", url: "/pages/add/add" },
  { key: "statistics", label: "统计", icon: "chart-bar", url: "/pages/statistics/statistics" },
  { key: "profile", label: "我的", icon: "user", url: "/pages/profile/profile" },
];

const tabs = computed(() =>
  props.active === "reminders"
    ? baseTabs.map((tab) =>
        tab.key === "statistics"
          ? {
              key: "reminders",
              label: "提醒",
              icon: "notification",
              url: "/pages/reminders/reminders",
              routeType: "page",
            } satisfies TabItem
          : tab,
      )
    : baseTabs,
);

function isRaised(tab: TabItem) {
  return props.active === "home" && tab.key === "add";
}

function goTab(tab: TabItem) {
  if (tab.key === props.active) return;

  if (tab.routeType === "page") {
    uni.navigateTo({ url: tab.url });
    return;
  }

  uni.switchTab({ url: tab.url });
}
</script>

<template>
  <view class="app-tabbar safe-area-bottom">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      class="tabbar-item"
      :class="{ active: active === tab.key, raised: isRaised(tab) }"
      @click="goTab(tab)"
    >
      <view class="tabbar-icon-wrap">
        <wd-icon :name="tab.icon" :size="isRaised(tab) ? '44rpx' : '40rpx'" />
      </view>
      <text v-if="!isRaised(tab)" class="tabbar-label">{{ tab.label }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.app-tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-fixed;
  min-height: 128rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rpx 24rpx 0;
  border-top: 2rpx solid $color-border;
  border-radius: 28rpx 28rpx 0 0;
  background: $color-bg-card;
  box-shadow: 0 -8rpx 24rpx rgba(21, 61, 53, 0.08);
}

.tabbar-item {
  min-width: 0;
  height: 112rpx;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  color: $color-text-secondary;
}

.tabbar-item.active {
  color: $color-primary;
}

.tabbar-icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
}

.tabbar-label {
  font-size: 22rpx;
  font-weight: $font-weight-semibold;
  line-height: 30rpx;
  color: inherit;
  letter-spacing: 0;
}

.tabbar-item.raised {
  transform: translateY(-34rpx);
}

.tabbar-item.raised .tabbar-icon-wrap {
  width: 96rpx;
  height: 96rpx;
  border-radius: $radius-full;
  color: $color-text-inverse;
  background: $color-primary;
  box-shadow: 0 16rpx 32rpx rgba(0, 108, 73, 0.28);
}
</style>
