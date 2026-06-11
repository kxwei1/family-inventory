<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import type { ReminderCategory, ReminderItem } from "@family-inventory/shared-types";
import AppTabBar from "@/components/AppTabBar.vue";
import { useRemindersStore, useRestockStore } from "@/stores";

const PENDING_RESTOCK_SELECTION_KEY = "fi:restock:pending_selection";
const remindersStore = useRemindersStore();
const restockStore = useRestockStore();
const { items: reminderItems, summary: reminderSummary, isLoading } =
  storeToRefs(remindersStore);
const activeCategory = ref<ReminderCategory>("soon");
const isCategoryFilterApplied = ref(false);
const isReadingAll = ref(false);
const dismissingIds = ref(new Set<string>());

const tabs: Array<{ id: ReminderCategory; label: string }> = [
  { id: "soon", label: "即将过期" },
  { id: "expired", label: "已过期" },
  { id: "stock", label: "库存不足" },
];

const visibleItems = computed(() =>
  isCategoryFilterApplied.value
    ? reminderItems.value.filter((item) => item.category === activeCategory.value)
    : reminderItems.value,
);

onShow(() => {
  void loadReminders();
});

onLoad((query) => {
  if (query?.category === "expired" || query?.category === "stock" || query?.category === "soon") {
    activeCategory.value = query.category;
    isCategoryFilterApplied.value = true;
  }
});

async function loadReminders() {
  try {
    await remindersStore.refresh();
  } catch {
    uni.showToast({ title: "提醒加载失败", icon: "none" });
  }
}

async function markAllRead() {
  if (isReadingAll.value || !reminderItems.value.length) return;

  isReadingAll.value = true;

  try {
    await remindersStore.readAll();
    uni.showToast({ title: "已标记全部已读", icon: "success" });
  } catch {
    uni.showToast({ title: "一键处理失败", icon: "none" });
  } finally {
    isReadingAll.value = false;
  }
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: "/pages/home/home" }),
  });
}

function selectCategory(category: ReminderCategory) {
  activeCategory.value = category;
  isCategoryFilterApplied.value = true;
}

async function handlePrimary(item: ReminderItem) {
  if (item.category === "stock") {
    if (item.productId) {
      await addStockReminderToRestock(item);
      return;
    }

    uni.navigateTo({ url: "/pages/restock/restock" });
    return;
  }

  if (item.productId) {
    uni.navigateTo({ url: `/pages/product-detail/product-detail?id=${encodeURIComponent(item.productId)}` });
    return;
  }

  void dismissItem(item, "已处理");
}

async function addStockReminderToRestock(item: ReminderItem) {
  if (!item.productId || dismissingIds.value.has(item.id)) return;

  const next = new Set(dismissingIds.value);
  next.add(item.id);
  dismissingIds.value = next;

  try {
    const itemId = await restockStore.addProduct({ productId: item.productId });
    uni.setStorageSync(PENDING_RESTOCK_SELECTION_KEY, { itemId });
    uni.showToast({ title: "已加入补货清单", icon: "success" });
    uni.navigateTo({ url: "/pages/restock/restock" });
  } catch {
    uni.showToast({ title: "加入补货失败", icon: "none" });
  } finally {
    const remaining = new Set(dismissingIds.value);
    remaining.delete(item.id);
    dismissingIds.value = remaining;
  }
}

async function dismissItem(item: ReminderItem, title = item.secondaryActionText || "已忽略") {
  if (dismissingIds.value.has(item.id)) return;

  const next = new Set(dismissingIds.value);
  next.add(item.id);
  dismissingIds.value = next;

  try {
    await remindersStore.dismiss({ itemId: item.id });
    uni.showToast({ title, icon: "success" });
  } catch {
    uni.showToast({ title: "处理提醒失败", icon: "none" });
  } finally {
    const remaining = new Set(dismissingIds.value);
    remaining.delete(item.id);
    dismissingIds.value = remaining;
  }
}

function handleSecondary(item: ReminderItem) {
  void dismissItem(item);
}
</script>

<template>
  <view class="reminders-page">
    <view class="topbar">
      <button class="icon-button" @click="goBack">
        <wd-icon name="arrow-left" size="42rpx" />
      </button>
      <text class="topbar-title">智能提醒</text>
      <button class="read-button" :disabled="isReadingAll" @click="markAllRead">
        {{ isReadingAll ? "处理中" : "全部已读" }}
      </button>
    </view>

    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <view class="summary-card">
        <view class="summary-title-row">
          <view class="summary-icon">
            <wd-icon name="warning" size="42rpx" />
          </view>
          <text class="summary-title">待处理事项</text>
        </view>
        <view class="summary-row">
          <view class="summary-count-row">
            <text class="summary-count">{{ reminderSummary.total }}</text>
            <text>项提醒需要关注</text>
          </view>
          <button class="summary-action" :disabled="isReadingAll || !reminderItems.length" @click="markAllRead">
            一键处理
          </button>
        </view>
      </view>

      <view class="tab-card">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="{ active: activeCategory === tab.id }"
          @click="selectCategory(tab.id)"
        >
          {{ tab.label }}
        </button>
      </view>

      <view v-if="isLoading" class="empty-state">加载中...</view>
      <view v-else-if="!visibleItems.length" class="empty-state">
        <wd-icon name="check-circle" size="72rpx" />
        <text>当前分类暂无提醒</text>
      </view>

      <view v-else class="reminder-list">
        <view
          v-for="item in visibleItems"
          :key="item.id"
          class="reminder-card"
          :class="`tone-${item.tone}`"
        >
          <view class="tone-strip" />
          <view class="reminder-main">
            <view class="reminder-head">
              <text class="badge">{{ item.badgeText }}</text>
              <text class="time">{{ item.timeText }}</text>
            </view>
            <view class="title">{{ item.title }}</view>
            <view class="description">{{ item.description }}</view>
            <view class="actions">
              <button
                v-if="item.secondaryActionText"
                class="secondary"
                :disabled="dismissingIds.has(item.id)"
                @click="handleSecondary(item)"
              >
                {{ dismissingIds.has(item.id) ? "处理中" : item.secondaryActionText }}
              </button>
              <button class="primary" :disabled="dismissingIds.has(item.id)" @click="handlePrimary(item)">
                {{ item.primaryActionText }}
              </button>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <AppTabBar active="reminders" />
  </view>
</template>

<style lang="scss" scoped>
.reminders-page {
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

.icon-button,
.read-button {
  min-width: 86rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  color: $color-primary;
}

.icon-button {
  justify-content: flex-start;
}

.read-button {
  justify-content: flex-end;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.topbar-title {
  font-size: 48rpx;
  font-weight: $font-weight-bold;
  line-height: 60rpx;
  color: $color-primary;
}

.content {
  height: calc(100vh - 96rpx);
  padding: 28rpx 28rpx calc(128rpx + env(safe-area-inset-bottom));
}

.summary-card {
  min-height: 196rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 30rpx;
  padding: 30rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: linear-gradient(135deg, $color-primary-light 0%, $color-primary 100%);
  color: #ffffff;
  box-shadow: $shadow-md;
}

.summary-title-row,
.summary-row,
.summary-count-row {
  display: flex;
  align-items: center;
}

.summary-title-row {
  gap: 16rpx;
}

.summary-icon {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  background: rgba(255, 255, 255, 0.2);
}

.summary-title {
  font-size: 32rpx;
  font-weight: $font-weight-bold;
}

.summary-row {
  justify-content: space-between;
  align-items: flex-end;
  gap: 20rpx;
  font-size: 26rpx;
  opacity: 0.92;
}

.summary-count-row {
  min-width: 0;
  align-items: flex-end;
  gap: 10rpx;
}

.summary-count {
  font-size: 54rpx;
  font-weight: $font-weight-bold;
  line-height: 58rpx;
}

.summary-action {
  min-width: 150rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 24rpx;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.summary-action[disabled] {
  opacity: 0.56;
}

.tab-card {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8rpx;
  margin-top: 30rpx;
  padding: 8rpx;
  border: 2rpx solid $color-border;
  border-radius: 16rpx;
  background: #ffffff;
}

.tab-card button {
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  color: $color-text-secondary;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.tab-card button.active {
  background: $color-primary;
  color: #ffffff;
}

.reminder-list {
  display: flex;
  flex-direction: column;
  gap: 22rpx;
  margin-top: 36rpx;
}

.reminder-card {
  min-height: 274rpx;
  display: flex;
  overflow: hidden;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: $shadow-sm;
}

.tone-strip {
  width: 10rpx;
  flex: 0 0 10rpx;
  background: $color-warning;
}

.tone-danger .tone-strip {
  background: $color-danger;
}

.tone-info .tone-strip {
  background: $color-accent;
}

.reminder-main {
  min-width: 0;
  flex: 1;
  padding: 30rpx;
}

.reminder-head {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
}

.badge {
  min-height: 42rpx;
  display: inline-flex;
  align-items: center;
  padding: 0 16rpx;
  border-radius: 8rpx;
  background: $color-warning-bg;
  color: $color-warning;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.tone-danger .badge {
  background: $color-danger-bg;
  color: $color-danger;
}

.tone-info .badge {
  background: $color-accent-bg;
  color: $color-accent;
}

.time {
  flex: 0 0 auto;
  font-size: 26rpx;
  line-height: 36rpx;
  color: $color-text-secondary;
}

.title {
  margin-top: 20rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 32rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.description {
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: $color-text-secondary;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 30rpx;
}

.actions button {
  min-width: 148rpx;
  height: 58rpx;
  border-radius: 14rpx;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.actions .secondary {
  min-width: 104rpx;
  background: $color-primary-bg;
  color: $color-text-primary;
}

.actions .primary {
  background: $color-primary;
  color: #ffffff;
}

.empty-state {
  min-height: 440rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22rpx;
  color: $color-text-secondary;
  font-size: 28rpx;
}
</style>
