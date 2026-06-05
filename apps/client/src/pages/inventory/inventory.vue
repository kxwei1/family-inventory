<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import type {
  InventoryProductSummary,
  InventoryStockStatus,
  ProductListFilters,
} from "@family-inventory/shared-types";
import AppTabBar from "@/components/AppTabBar.vue";
import PetPawMark from "@/components/PetPawMark.vue";
import { useInventoryStore } from "@/stores";

const PENDING_INVENTORY_FILTER_KEY = "fi:inventory:pending_filter";
const inventoryStore = useInventoryStore();
const { products, isLoading, activeCategory, activeStatus, searchQuery } =
  storeToRefs(inventoryStore);
const isFilterSheetVisible = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const categories = [
  { id: "all", label: "全部" },
  { id: "food", label: "猫粮" },
  { id: "can", label: "罐头" },
  { id: "litter", label: "猫砂" },
  { id: "snack", label: "零食" },
];

const categoryLabelById = new Map(categories.map((category) => [category.id, category.label]));

const statusOptions: Array<{ id: InventoryStockStatus | "all"; label: string; description: string }> = [
  { id: "all", label: "全部状态", description: "查看所有库存商品" },
  { id: "enough", label: "库存充足", description: "无需立即处理" },
  { id: "low", label: "即将耗尽", description: "建议加入补货清单" },
  { id: "empty", label: "已耗尽", description: "需要尽快补货" },
];

const activeStatusLabel = computed(
  () => statusOptions.find((status) => status.id === activeStatus.value)?.label ?? "全部状态",
);

const hasActiveFilters = computed(() => inventoryStore.hasActiveFilters);

const displayedProducts = computed(() => products.value);

onShow(() => {
  uni.hideTabBar({ animation: false });

  applyPendingInventoryFilter();
  void loadProducts();
});

onLoad((query) => {
  if (typeof query?.category === "string") {
    applyCategoryFilter(query.category);
  }

  if (typeof query?.status === "string") {
    applyStatusFilter(query.status);
  }

  if (typeof query?.q === "string") {
    searchQuery.value = query.q;
  }
});

function selectCategory(id: string) {
  inventoryStore.setCategory(id);
  void loadProducts();
}

function applyCategoryFilter(value?: string) {
  if (!value) return false;

  const category = categories.find((item) => item.id === value || item.label === value);

  if (!category) return false;

  inventoryStore.setCategory(category.id);
  return true;
}

function applyStatusFilter(value?: string) {
  const status = statusOptions.find((item) => item.id === value);

  if (!status) return false;

  inventoryStore.setStatus(status.id);
  return true;
}

function applyPendingInventoryFilter() {
  const pending = uni.getStorageSync(PENDING_INVENTORY_FILTER_KEY) as
    | { category?: string; status?: InventoryStockStatus | "all"; query?: string }
    | "";

  if (!pending || typeof pending !== "object") {
    return false;
  }

  uni.removeStorageSync(PENDING_INVENTORY_FILTER_KEY);

  let changed = false;
  changed = applyCategoryFilter(pending.category) || changed;
  changed = applyStatusFilter(pending.status) || changed;

  if (typeof pending.query === "string") {
    inventoryStore.setSearchQuery(pending.query);
    changed = true;
  }

  return changed;
}

async function loadProducts() {
  try {
    await inventoryStore.refresh(currentFilters());
  } catch {
    uni.showToast({ title: "库存加载失败", icon: "none" });
  }
}

function currentFilters(): ProductListFilters {
  return {
    query: searchQuery.value,
    category: activeCategory.value === "all"
      ? undefined
      : categoryLabelById.get(activeCategory.value),
    status: activeStatus.value,
  };
}

function scheduleSearch() {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  searchTimer = setTimeout(() => {
    void loadProducts();
  }, 260);
}

function submitSearch() {
  if (searchTimer) {
    clearTimeout(searchTimer);
  }

  void loadProducts();
}

function clearSearch() {
  inventoryStore.setSearchQuery("");
  submitSearch();
}

function openFilterSheet() {
  isFilterSheetVisible.value = true;
}

function closeFilterSheet() {
  isFilterSheetVisible.value = false;
}

function selectStatus(status: InventoryStockStatus | "all") {
  inventoryStore.setStatus(status);
  isFilterSheetVisible.value = false;
  void loadProducts();
}

function resetFilters() {
  inventoryStore.resetFilters();
  isFilterSheetVisible.value = false;
  void loadProducts();
}

function addProduct() {
  uni.switchTab({ url: "/pages/add/add" });
}

function openDetail(product: InventoryProductSummary) {
  uni.navigateTo({
    url: `/pages/product-detail/product-detail?id=${encodeURIComponent(product.id)}`,
  });
}

function formatProductMeta(product: InventoryProductSummary) {
  return `${product.brand} · ${product.spec}`;
}

function goReminders() {
  uni.navigateTo({ url: "/pages/reminders/reminders" });
}
</script>

<template>
  <view class="inventory-page">
    <view class="topbar">
      <view class="topbar-brand">
        <PetPawMark />
      </view>
      <text class="topbar-title">宠物管家</text>
      <button class="topbar-icon" @click="goReminders">
        <wd-icon name="notification" size="44rpx" />
      </button>
    </view>

    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <view class="search-bar">
        <wd-icon name="search" size="42rpx" />
        <input
          v-model="searchQuery"
          class="search-input"
          confirm-type="search"
          placeholder="搜索商品名 / 品牌"
          @confirm="submitSearch"
          @input="scheduleSearch"
        />
        <button v-if="searchQuery" class="clear-search" @click="clearSearch">
          <wd-icon name="close" size="30rpx" />
        </button>
        <view class="search-divider" />
        <button class="filter-button" :class="{ active: activeStatus !== 'all' }" @click="openFilterSheet">
          <wd-icon name="filter" size="38rpx" />
        </button>
      </view>

      <view v-if="hasActiveFilters" class="filter-summary">
        <text>{{ activeStatusLabel }} · {{ displayedProducts.length }} 件商品</text>
        <button @click="resetFilters">重置</button>
      </view>

      <scroll-view class="chip-scroll" scroll-x :show-scrollbar="false">
        <button
          v-for="category in categories"
          :key="category.id"
          class="chip"
          :class="{ active: activeCategory === category.id }"
          @click="selectCategory(category.id)"
        >
          {{ category.label }}
        </button>
      </scroll-view>

      <view v-if="isLoading" class="list-state">加载中...</view>
      <view v-else-if="!displayedProducts.length" class="list-state empty">
        <wd-icon name="search" size="64rpx" />
        <text>没有找到匹配的库存商品</text>
        <button v-if="hasActiveFilters" @click="resetFilters">清空筛选</button>
      </view>

      <view v-else class="product-list">
        <view
          v-for="product in displayedProducts"
          :key="product.id"
          class="product-card"
          :class="`status-${product.status}`"
          @click="openDetail(product)"
        >
          <image class="product-image" :src="product.image" mode="aspectFill" />

          <view class="product-main">
            <view class="product-name">{{ product.name }}</view>
            <view class="product-meta">{{ formatProductMeta(product) }}</view>
            <view class="status-pill">{{ product.statusText }}</view>
          </view>

          <view class="product-count">
            <text class="amount">{{ product.quantity }}</text>
            <text class="unit">{{ product.unit }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <button class="fab" @click="addProduct">
      <wd-icon name="add" size="52rpx" />
    </button>

    <AppTabBar active="inventory" />

    <view v-if="isFilterSheetVisible" class="sheet-mask" @click="closeFilterSheet">
      <view class="filter-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-head">
          <text>库存筛选</text>
          <button @click="closeFilterSheet">
            <wd-icon name="close" size="40rpx" />
          </button>
        </view>

        <view class="status-options">
          <button
            v-for="status in statusOptions"
            :key="status.id"
            :class="{ active: activeStatus === status.id }"
            @click="selectStatus(status.id)"
          >
            <view>
              <text>{{ status.label }}</text>
              <text>{{ status.description }}</text>
            </view>
            <wd-icon v-if="activeStatus === status.id" name="check" size="34rpx" />
          </button>
        </view>

        <button class="reset-filter" @click="resetFilters">重置全部筛选</button>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.inventory-page {
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
  padding: 32rpx 32rpx 230rpx;
}

.search-bar {
  height: 96rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 0 32rpx;
  border: 2rpx solid $color-border;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(21, 61, 53, 0.02);
  color: $color-text-secondary;
}

.search-input {
  min-width: 0;
  flex: 1;
  height: 96rpx;
  font-size: 30rpx;
  color: $color-text-primary;
}

.clear-search,
.filter-button {
  width: 54rpx;
  height: 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  color: $color-text-secondary;
}

.clear-search {
  background: $color-bg-muted;
}

.filter-button.active {
  background: $color-primary-bg;
  color: $color-primary;
}

.search-divider {
  width: 2rpx;
  height: 40rpx;
  background: $color-border;
}

.filter-summary {
  min-height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 20rpx;
  padding: 0 18rpx;
  border-radius: 12rpx;
  background: $color-primary-bg;
  color: $color-primary;
}

.filter-summary text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.filter-summary button {
  flex: 0 0 auto;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.chip-scroll {
  margin: 44rpx -32rpx 0;
  padding: 0 32rpx 10rpx;
  white-space: nowrap;
}

.chip {
  min-width: 116rpx;
  height: 60rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-right: 22rpx;
  padding: 0 36rpx;
  border: 2rpx solid $color-border;
  border-radius: $radius-full;
  background: #ffffff;
  color: $color-text-secondary;
  font-size: 28rpx;
  font-weight: $font-weight-bold;
  line-height: 36rpx;
}

.chip.active {
  border-color: $color-primary;
  background: $color-primary;
  color: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(0, 108, 73, 0.16);
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 40rpx;
}

.list-state {
  min-height: 420rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 34rpx;
  color: $color-text-secondary;
  font-size: 28rpx;
}

.list-state.empty {
  flex-direction: column;
  gap: 22rpx;
}

.list-state.empty button {
  height: 72rpx;
  padding: 0 30rpx;
  border-radius: 14rpx;
  background: $color-primary;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: $font-weight-bold;
}

.product-card {
  min-height: 208rpx;
  display: flex;
  align-items: center;
  gap: 32rpx;
  padding: 32rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: $shadow-md;
}

.product-image {
  width: 160rpx;
  height: 160rpx;
  flex: 0 0 160rpx;
  border-radius: 16rpx;
  background: $color-bg-muted;
}

.product-card.status-empty {
  opacity: 0.72;
}

.status-empty .product-image {
  filter: grayscale(45%);
}

.product-main {
  min-width: 0;
  flex: 1;
}

.product-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 36rpx;
  font-weight: $font-weight-bold;
  line-height: 52rpx;
  color: $color-text-primary;
}

.status-empty .product-name {
  color: $color-text-secondary;
}

.product-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 34rpx;
  color: $color-text-secondary;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42rpx;
  margin-top: 20rpx;
  padding: 0 18rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
  line-height: 30rpx;
}

.status-enough .status-pill {
  background: $color-primary-bg;
  color: $color-primary-light;
}

.status-low .status-pill {
  background: $color-warning-bg;
  color: $color-warning;
}

.status-empty .status-pill {
  background: #fff1f1;
  color: #ef6b6b;
}

.product-count {
  min-width: 72rpx;
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 8rpx;
}

.amount {
  font-size: 54rpx;
  font-weight: $font-weight-bold;
  line-height: 62rpx;
  color: $color-primary;
}

.status-low .amount {
  color: $color-warning;
}

.status-empty .amount {
  color: #ef6b6b;
}

.unit {
  font-size: 24rpx;
  line-height: 32rpx;
  color: $color-text-secondary;
}

.fab {
  position: fixed;
  right: 32rpx;
  bottom: 176rpx;
  z-index: $z-fixed;
  width: 112rpx;
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  background: $color-primary-light;
  color: #ffffff;
  box-shadow: 0 16rpx 40rpx rgba(24, 185, 129, 0.32);
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: $z-modal-mask;
  display: flex;
  align-items: flex-end;
  background: rgba(10, 31, 33, 0.48);
}

.filter-sheet {
  width: 100%;
  padding: 22rpx 28rpx 32rpx;
  border-radius: 28rpx 28rpx 0 0;
  background: #ffffff;
  box-shadow: 0 -16rpx 48rpx rgba(21, 61, 53, 0.18);
}

.sheet-handle {
  width: 88rpx;
  height: 10rpx;
  margin: 0 auto 34rpx;
  border-radius: $radius-full;
  background: $color-border-light;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet-head > text {
  font-size: 38rpx;
  font-weight: $font-weight-bold;
  line-height: 50rpx;
  color: $color-text-primary;
}

.sheet-head button {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  background: #d9eff0;
  color: $color-text-primary;
}

.status-options {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
  margin-top: 30rpx;
}

.status-options button {
  min-height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  border: 2rpx solid $color-border;
  border-radius: 18rpx;
  color: $color-text-secondary;
}

.status-options button.active {
  border-color: $color-primary;
  background: $color-primary-bg;
  color: $color-primary;
}

.status-options button view {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8rpx;
}

.status-options text:first-child {
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.status-options text:last-child {
  font-size: 24rpx;
  line-height: 34rpx;
  color: $color-text-secondary;
}

.reset-filter {
  width: 100%;
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 30rpx;
  border-radius: 16rpx;
  background: $color-primary;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
}
</style>
