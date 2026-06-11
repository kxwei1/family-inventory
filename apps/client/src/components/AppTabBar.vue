<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useRemindersStore } from "@/stores";

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

const remindersStore = useRemindersStore();
const { summary } = storeToRefs(remindersStore);
const reminderTotal = computed(() => summary.value.total);
const homeBadgeCount = computed(() => reminderTotal.value);

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

function badgeFor(tab: TabItem) {
  if (tab.key === "home") return homeBadgeCount.value;
  if (tab.key === "reminders") return reminderTotal.value;
  return 0;
}

function badgeText(count: number) {
  if (count <= 0) return "";
  return count > 99 ? "99+" : String(count);
}

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
  <view class="app-tabbar glass-panel">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      class="tabbar-item"
      :class="{ active: active === tab.key, raised: isRaised(tab) }"
      @click="goTab(tab)"
    >
      <view class="tabbar-icon-wrap">
        <wd-icon :name="tab.icon" :size="isRaised(tab) ? '44rpx' : '40rpx'" />
        <text
          v-if="badgeFor(tab) > 0 && !isRaised(tab)"
          class="tabbar-badge"
          :class="{ wide: badgeFor(tab) > 9 }"
        >
          {{ badgeText(badgeFor(tab)) }}
        </text>
      </view>
      <text v-if="!isRaised(tab)" class="tabbar-label">{{ tab.label }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.app-tabbar {
  --tabbar-track-height: 128rpx;

  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-fixed;
  height: calc(var(--tabbar-track-height) + max(env(safe-area-inset-bottom), 0px));
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 8rpx 12rpx max(env(safe-area-inset-bottom), 0px);
  border-top: 2rpx solid $color-border;
  border-radius: 24rpx 24rpx 0 0;
  background: transparent;
  box-shadow: 0 -8rpx 24rpx rgba(255, 127, 80, 0.06);
  box-sizing: border-box;
  overflow: visible;
}

.tabbar-item {
  min-width: 0;
  height: calc(var(--tabbar-track-height) - 16rpx);
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 12rpx 0 10rpx;
  color: $color-text-secondary;
}

.tabbar-item.active {
  color: $color-primary;
}

.tabbar-icon-wrap {
  position: relative;
  width: 44rpx;
  height: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: inherit;
  transition: transform $transition-fast;
}

.tabbar-item.active .tabbar-icon-wrap {
  transform: scale(1.15);
}

.tabbar-badge {
  position: absolute;
  top: 0;
  left: calc(50% + 12rpx);
  min-width: 28rpx;
  height: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6rpx;
  border: 2rpx solid $color-bg-card;
  border-radius: $radius-full;
  background: $color-danger;
  color: $color-text-inverse;
  font-size: 18rpx;
  font-weight: $font-weight-bold;
  line-height: 24rpx;
  white-space: nowrap;
  pointer-events: none;
}

.tabbar-badge.wide {
  min-width: 44rpx;
  font-size: 16rpx;
}

.tabbar-label {
  font-size: 20rpx;
  font-weight: $font-weight-semibold;
  line-height: 28rpx;
  color: inherit;
  letter-spacing: 0;
}

.tabbar-item.raised {
  padding-top: 0;
  padding-bottom: 0;
  transform: translateY(-28rpx);
}

.tabbar-item.raised .tabbar-icon-wrap {
  width: 88rpx;
  height: 88rpx;
  border-radius: $radius-full;
  color: $color-text-inverse;
  background: $color-primary;
  box-shadow: 0 16rpx 32rpx rgba(255, 127, 80, 0.32);
}
</style>
