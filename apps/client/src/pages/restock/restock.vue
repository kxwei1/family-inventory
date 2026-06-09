<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import type { RestockItem, RestockPlan } from "@family-inventory/shared-types";
import { useRestockStore } from "@/stores";

const PENDING_RESTOCK_SELECTION_KEY = "fi:restock:pending_selection";
const restockStore = useRestockStore();
const { plan } = storeToRefs(restockStore);
const selectedIds = ref(new Set<string>());
const isCompleting = ref(false);
const removingIds = ref(new Set<string>());
const addingRecommendationIds = ref(new Set<string>());
const allItems = computed(() => plan.value.groups.flatMap((group) => group.items));
const isAllSelected = computed(
  () => allItems.value.length > 0 && selectedIds.value.size === allItems.value.length,
);
const generateButtonLabel = computed(() => (isAllSelected.value ? "全部取消" : "生成清单"));
const selectedCount = computed(() => selectedIds.value.size);
const purchaseButtonLabel = computed(() => {
  if (isCompleting.value) return "入库中...";
  if (selectedCount.value > 0) return `入库 ${selectedCount.value} 项`;
  return "标记已购并入库";
});

onShow(() => {
  void loadPlan();
});

async function loadPlan() {
  try {
    await restockStore.refresh();
    applyPendingSelection();
  } catch {
    showToast("补货清单加载失败");
  }
}

function applyPendingSelection() {
  const pending = uni.getStorageSync(PENDING_RESTOCK_SELECTION_KEY) as { itemId?: string } | "";

  if (!pending || typeof pending !== "object" || !pending.itemId) {
    return;
  }

  uni.removeStorageSync(PENDING_RESTOCK_SELECTION_KEY);

  if (!allItems.value.some((item) => item.id === pending.itemId)) {
    return;
  }

  selectedIds.value = new Set([...selectedIds.value, pending.itemId]);
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: "/pages/home/home" }),
  });
}

function toggleItem(item: RestockItem) {
  const next = new Set(selectedIds.value);

  if (next.has(item.id)) {
    next.delete(item.id);
  } else {
    next.add(item.id);
  }

  selectedIds.value = next;
}

function isSelected(item: RestockItem) {
  return selectedIds.value.has(item.id);
}

function showToast(title: string) {
  uni.showToast({ title, icon: "none" });
}

function selectAllItems() {
  if (!allItems.value.length) {
    showToast("暂无可生成的清单");
    return;
  }

  if (isAllSelected.value) {
    selectedIds.value = new Set();
    uni.showToast({ title: "已清空选择", icon: "none" });
    return;
  }

  selectedIds.value = new Set(allItems.value.map((item) => item.id));
  uni.showToast({ title: `已生成 ${allItems.value.length} 项清单`, icon: "success" });
}

async function removeItem(item: RestockItem) {
  if (removingIds.value.has(item.id)) return;

  const pending = new Set(removingIds.value);
  pending.add(item.id);
  removingIds.value = pending;

  try {
    await restockStore.remove({ itemId: item.id });
    const nextSelected = new Set(selectedIds.value);
    nextSelected.delete(item.id);
    selectedIds.value = nextSelected;
    uni.showToast({ title: "已移除补货项", icon: "success" });
  } catch {
    showToast("移除补货项失败");
  } finally {
    const next = new Set(removingIds.value);
    next.delete(item.id);
    removingIds.value = next;
  }
}

async function addRecommendation(recommendation: RestockPlan["recommendations"][number]) {
  if (addingRecommendationIds.value.has(recommendation.id)) return;

  const pending = new Set(addingRecommendationIds.value);
  pending.add(recommendation.id);
  addingRecommendationIds.value = pending;

  try {
    const itemId = await restockStore.addRecommendation({ recommendationId: recommendation.id });
    selectedIds.value = new Set([...selectedIds.value, itemId]);
    uni.showToast({ title: "已加入清单", icon: "success" });
  } catch {
    showToast("加入清单失败");
  } finally {
    const next = new Set(addingRecommendationIds.value);
    next.delete(recommendation.id);
    addingRecommendationIds.value = next;
  }
}

async function markPurchased() {
  if (isCompleting.value) return;

  if (!selectedIds.value.size) {
    uni.showToast({ title: "请选择要入库的商品", icon: "none" });
    return;
  }

  isCompleting.value = true;
  const completingIds = [...selectedIds.value];

  try {
    await restockStore.complete({ itemIds: completingIds });
    selectedIds.value = new Set();
    uni.showToast({ title: `已入库 ${completingIds.length} 项`, icon: "success" });
  } catch {
    showToast("补货入库失败");
  } finally {
    isCompleting.value = false;
  }
}

function formatMoney(value: number) {
  return `¥ ${value.toFixed(2)}`;
}

function buildPlanText() {
  const lines = plan.value.groups.flatMap((group) => [
    `【${group.title}】`,
    ...group.items.map((item) => `- ${item.name}：${item.description}`),
  ]);

  return ["家庭库存补货清单", ...lines].join("\n");
}

function copyPlan(title = "已复制清单") {
  if (!allItems.value.length) {
    showToast("暂无可复制的清单");
    return;
  }

  uni.setClipboardData({
    data: buildPlanText(),
    success: () => uni.showToast({ title, icon: "success" }),
    fail: () => showToast("复制失败"),
  });
}

function sharePlan() {
  copyPlan("清单已复制，可粘贴分享");
}
</script>

<template>
  <view class="restock-page">
    <view class="topbar">
      <button class="icon-button" @click="goBack">
        <wd-icon name="arrow-left" size="44rpx" />
      </button>
      <text class="topbar-title">该补货啦</text>
      <button class="generate-button" @click="selectAllItems">{{ generateButtonLabel }}</button>
    </view>

    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <view class="summary-card">
        <view>
          <view class="summary-label">预计支出（元）</view>
          <view class="summary-amount">{{ formatMoney(plan.estimatedCost) }}</view>
        </view>
        <view class="summary-last">
          <text>上次补货</text>
          <text>{{ plan.lastRestockedText }}</text>
        </view>
      </view>

      <view v-for="group in plan.groups" :key="group.id" class="restock-group">
        <view class="group-title">
          <view class="group-icon">
            <wd-icon :name="group.icon" size="38rpx" />
          </view>
          <text>{{ group.title }}</text>
        </view>

        <view class="group-card">
          <view
            v-for="item in group.items"
            :key="item.id"
            class="restock-row"
            @click="toggleItem(item)"
          >
            <view class="checkbox" :class="{ checked: isSelected(item) }">
              <wd-icon v-if="isSelected(item)" name="check" size="26rpx" />
            </view>
            <image v-if="item.image" class="item-image" :src="item.image" mode="aspectFill" />
            <view v-else class="item-icon">
              <wd-icon :name="item.icon || 'list'" size="42rpx" />
            </view>
            <view class="item-main">
              <view class="item-name" :class="{ checked: isSelected(item) }">{{ item.name }}</view>
              <view class="item-desc">{{ item.description }}</view>
            </view>
            <button
              class="trash-button"
              :disabled="removingIds.has(item.id)"
              @click.stop="removeItem(item)"
            >
              <wd-icon name="delete" size="34rpx" />
            </button>
          </view>
        </view>
      </view>

      <view class="recommend-section">
        <view class="recommend-title">
          <wd-icon name="tips" size="34rpx" />
          <text>智能推荐</text>
        </view>

        <scroll-view class="recommend-scroll" scroll-x :show-scrollbar="false">
          <view
            v-for="recommendation in plan.recommendations"
            :key="recommendation.id"
            class="recommend-card"
          >
            <image
              v-if="recommendation.image"
              class="recommend-image"
              :src="recommendation.image"
              mode="aspectFill"
            />
            <view v-else class="recommend-image icon-only">
              <wd-icon :name="recommendation.icon || 'star'" size="58rpx" />
            </view>
            <view class="recommend-name">{{ recommendation.name }}</view>
            <view class="recommend-reason">{{ recommendation.reason }}</view>
            <button
              :disabled="addingRecommendationIds.has(recommendation.id)"
              @click="addRecommendation(recommendation)"
            >
              {{ addingRecommendationIds.has(recommendation.id) ? "加入中" : "+ 加入清单" }}
            </button>
          </view>
        </scroll-view>
      </view>
    </scroll-view>

    <view class="bottom-actions safe-area-bottom">
      <button class="minor" @click="copyPlan()">
        <wd-icon name="file-copy" size="40rpx" />
      </button>
      <button class="minor" @click="sharePlan">
        <wd-icon name="share" size="40rpx" />
      </button>
      <button class="primary" :disabled="isCompleting" @click="markPurchased">
        {{ purchaseButtonLabel }}
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.restock-page {
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
}

.icon-button {
  position: relative;
  z-index: 1;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: $color-primary;
}

.topbar-title {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  font-size: 46rpx;
  font-weight: $font-weight-bold;
  line-height: 58rpx;
  color: $color-primary;
}

.generate-button {
  position: relative;
  z-index: 1;
  min-width: 126rpx;
  height: 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  background: $color-primary-bg;
  color: $color-primary;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.content {
  box-sizing: border-box;
  height: calc(100vh - 96rpx);
  padding: 28rpx 32rpx 202rpx;
}

.summary-card {
  position: relative;
  min-height: 176rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-radius: 24rpx;
  overflow: hidden;
  background: #ffffff;
  box-shadow: $shadow-md;
}

.summary-card::after {
  content: "";
  position: absolute;
  top: -70rpx;
  right: -62rpx;
  width: 232rpx;
  height: 232rpx;
  border-radius: $radius-full;
  background: #eaf3ff;
  opacity: 0.72;
}

.summary-card > view {
  position: relative;
  z-index: 1;
}

.summary-label {
  color: $color-text-secondary;
  font-size: 26rpx;
}

.summary-amount {
  margin-top: 16rpx;
  font-size: 52rpx;
  font-weight: $font-weight-bold;
  line-height: 62rpx;
  color: $color-text-primary;
}

.summary-last {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16rpx;
  color: $color-text-primary;
  font-size: 30rpx;
}

.summary-last text:first-child {
  color: $color-text-secondary;
  font-size: 24rpx;
}

.restock-group {
  margin-top: 36rpx;
}

.group-title,
.recommend-title {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 22rpx;
}

.group-title text,
.recommend-title text {
  font-size: 34rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.group-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  background: #d9eff0;
  color: $color-primary;
}

.group-card {
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: $shadow-md;
  overflow: hidden;
}

.restock-row {
  min-height: 136rpx;
  display: flex;
  align-items: center;
  gap: 22rpx;
  padding: 24rpx 20rpx;
  border-bottom: 2rpx solid $color-border;
}

.restock-row:last-child {
  border-bottom: 0;
}

.checkbox {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 48rpx;
  border: 2rpx solid $color-text-secondary;
  border-radius: 8rpx;
  color: #ffffff;
}

.checkbox.checked {
  border-color: $color-primary;
  background: $color-primary;
}

.item-image,
.item-icon {
  width: 96rpx;
  height: 96rpx;
  flex: 0 0 96rpx;
  border-radius: 14rpx;
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  background: $color-primary-bg;
  color: $color-primary;
}

.item-main {
  min-width: 0;
  flex: 1;
}

.item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 30rpx;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.item-name.checked {
  color: $color-text-secondary;
  text-decoration: line-through;
}

.item-desc {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $color-text-secondary;
}

.trash-button {
  width: 54rpx;
  height: 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-text-secondary;
}

.recommend-section {
  margin-top: 44rpx;
}

.recommend-title {
  color: $color-accent-yellow;
}

.recommend-scroll {
  margin: 0 -32rpx;
  padding: 0 32rpx 16rpx;
  white-space: nowrap;
}

.recommend-card {
  width: 280rpx;
  display: inline-flex;
  flex-direction: column;
  margin-right: 24rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: $shadow-md;
}

.recommend-image {
  width: 232rpx;
  height: 192rpx;
  border-radius: 14rpx;
  background: $color-accent-bg;
}

.recommend-image.icon-only {
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-accent;
}

.recommend-name {
  margin-top: 18rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 28rpx;
  color: $color-text-primary;
}

.recommend-reason {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $color-text-secondary;
}

.recommend-card button {
  height: 54rpx;
  margin-top: 20rpx;
  border-radius: 12rpx;
  background: $color-primary-bg;
  color: $color-primary;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-fixed;
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  border-top: 2rpx solid $color-border;
  background: #ffffff;
}

.bottom-actions button {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
}

.bottom-actions .minor {
  width: 96rpx;
  color: $color-text-primary;
  border: 2rpx solid $color-border;
}

.bottom-actions .primary {
  flex: 1;
  background: $color-primary-light;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: $font-weight-bold;
}

.bottom-actions .primary[disabled] {
  opacity: 0.62;
}
</style>
