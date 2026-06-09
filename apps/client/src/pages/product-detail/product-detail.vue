<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import type { ConsumeProductRequest } from "@family-inventory/shared-types";
import type {
  ProductBatchSummary,
  ProductDetailResponse,
  ProductStockLogSummary,
} from "@family-inventory/shared-types";
import {
  archiveProduct,
  fetchProductLogs,
} from "@/services/inventoryApi";
import { useProductDetailStore, useRestockStore } from "@/stores";

const PENDING_RESTOCK_SELECTION_KEY = "fi:restock:pending_selection";
const DEFAULT_PRODUCT_DETAIL_ID = "prod_royal_kitten_food";
const productDetailStore = useProductDetailStore();
const restockStore = useRestockStore();
const detail = ref<ProductDetailResponse | null>(null);
const isConsumeSheetVisible = ref(false);
const isHistorySheetVisible = ref(false);
const isActionSheetVisible = ref(false);
const isEditSheetVisible = ref(false);
const consumeQuantity = ref(1);
const consumeActionType = ref<ConsumeProductRequest["actionType"]>("daily");
const consumeNotes = ref("");
const editName = ref("");
const editBrand = ref("");
const editCategory = ref("");
const editSpec = ref("");
const editUnit = ref("");
const editQuantity = ref(0);
const editPurchasePrice = ref("");
const editPurchaseChannel = ref("");
const editLocation = ref("");
const editStockInDate = ref("");
const editIsOpened = ref(false);
const editNotes = ref("");
const isConsuming = ref(false);
const isHistoryLoading = ref(false);
const isUpdatingProduct = ref(false);
const isArchiving = ref(false);
const isAddingRestock = ref(false);
const historyLogs = ref<ProductStockLogSummary[]>([]);
const loadError = ref("");
const productId = ref("");
let hasLoadedDetail = false;

const heroStatus = computed(() => {
  if (!detail.value) {
    return { text: "", tone: "enough" };
  }

  const expiredBatch = detail.value.batches.find((batch) => batch.status === "expired");
  const warningBatch = detail.value.batches.find((batch) => batch.status === "warning");

  if (expiredBatch) {
    return { text: expiredBatch.statusText, tone: "empty" };
  }

  if (warningBatch) {
    return { text: warningBatch.statusText, tone: "low" };
  }

  return {
    text: detail.value.item.statusText,
    tone: detail.value.item.status,
  };
});

const consumeActionTypes: Array<{ id: ConsumeProductRequest["actionType"]; label: string }> = [
  { id: "daily", label: "日常消耗" },
  { id: "adjust", label: "库存调整" },
  { id: "expired", label: "过期损耗" },
  { id: "gift", label: "客户赠送" },
];

const trendPoints = computed(() => detail.value?.consumptionTrend ?? []);
const detailTitle = computed(() => {
  if (!detail.value) return "商品详情";

  return detail.value.item.id === DEFAULT_PRODUCT_DETAIL_ID
    ? "皇家幼猫粮"
    : detail.value.item.name;
});
const firstTrendLabel = computed(() => trendPoints.value[0]?.label ?? "");
const lastTrendLabel = computed(() => trendPoints.value[trendPoints.value.length - 1]?.label ?? "");
const trendMarker = computed(() => {
  const points = trendPoints.value;
  const point = points[points.length - 1];

  if (!point || points.length < 2) return null;

  return {
    left: 100,
    bottom: clampTrendValue(point.value),
  };
});
const trendLineSegments = computed(() => {
  const points = trendPoints.value;

  if (points.length < 2) return [];

  const step = 100 / (points.length - 1);

  return points.slice(0, -1).map((point, index) => {
    const nextPoint = points[index + 1];
    const left = index * step;
    const bottom = clampTrendValue(point.value);
    const dx = step;
    const dy = clampTrendValue(nextPoint.value) - bottom;

    return {
      id: `${point.label}-${nextPoint.label}`,
      left,
      bottom,
      width: Math.hypot(dx, dy),
      angle: -(Math.atan2(dy, dx) * 180) / Math.PI,
    };
  });
});

onShow(() => {

  if (productId.value && hasLoadedDetail) {
    void loadDetail(productId.value);
  }
});

onLoad((query) => {
  const id = typeof query?.id === "string" ? query.id : DEFAULT_PRODUCT_DETAIL_ID;
  const shouldOpenConsume = query?.consume === "1";

  productId.value = id;
  void loadDetail(id).then(() => {
    if (shouldOpenConsume) {
      openConsumeSheet();
    }
  });
});

async function loadDetail(id: string) {
  loadError.value = "";

  const cached = productDetailStore.detailById(id);
  if (cached) detail.value = cached;

  const next = await productDetailStore.refresh(id);
  if (next) {
    detail.value = next;
  } else {
    detail.value = null;
    loadError.value = "商品不存在或已归档";
  }
  hasLoadedDetail = true;
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: "/pages/inventory/inventory" }),
  });
}

function showToast(title: string) {
  uni.showToast({ title, icon: "none" });
}

async function goRestock() {
  if (!detail.value || isAddingRestock.value) return;

  isAddingRestock.value = true;

  try {
    const itemId = await restockStore.addProduct({ productId: detail.value.item.id });
    uni.setStorageSync(PENDING_RESTOCK_SELECTION_KEY, { itemId });
    uni.showToast({ title: "已加入补货清单", icon: "success" });
    uni.navigateTo({ url: "/pages/restock/restock" });
  } catch {
    showToast("加入补货失败");
  } finally {
    isAddingRestock.value = false;
  }
}

function openActionSheet() {
  if (!detail.value) return;
  isActionSheetVisible.value = true;
}

function closeActionSheet() {
  isActionSheetVisible.value = false;
}

function copyProductName() {
  if (!detail.value) return;

  uni.setClipboardData({
    data: detail.value.item.name,
    success: () => uni.showToast({ title: "商品名已复制", icon: "success" }),
    fail: () => showToast("复制失败"),
  });
  closeActionSheet();
}

function openEditSheet() {
  if (!detail.value) return;

  editName.value = detail.value.item.name;
  editBrand.value = detail.value.item.brand;
  editCategory.value = detail.value.item.category;
  editSpec.value = detail.value.item.spec;
  editUnit.value = detail.value.item.unit;
  editQuantity.value = detail.value.item.quantity;
  editPurchasePrice.value = detail.value.item.purchasePrice?.toString() ?? "";
  editPurchaseChannel.value = detail.value.item.purchaseChannel ?? "";
  editLocation.value = detail.value.item.location ?? "";
  editStockInDate.value = detail.value.item.stockInDate ?? "";
  editIsOpened.value = detail.value.item.isOpened ?? false;
  editNotes.value = "";
  isEditSheetVisible.value = true;
  closeActionSheet();
}

function closeEditSheet() {
  if (isUpdatingProduct.value) return;
  isEditSheetVisible.value = false;
}

function changeEditQuantity(delta: number) {
  editQuantity.value = Math.max(0, editQuantity.value + delta);
}

async function confirmProductUpdate() {
  if (!detail.value || isUpdatingProduct.value) return;

  const name = editName.value.trim();
  const category = editCategory.value.trim();
  const unit = editUnit.value.trim();
  const quantity = Number(editQuantity.value);

  if (!name || !category || !unit) {
    showToast("请补全名称、分类和单位");
    return;
  }

  if (!Number.isFinite(quantity) || quantity < 0) {
    showToast("请输入有效库存");
    return;
  }

  const purchasePriceText = editPurchasePrice.value.trim();
  let purchasePrice: number | null = null;

  if (purchasePriceText) {
    const parsedPurchasePrice = Number(purchasePriceText);

    if (!Number.isFinite(parsedPurchasePrice) || parsedPurchasePrice < 0) {
      showToast("请输入有效的购入价格");
      return;
    }

    purchasePrice = parsedPurchasePrice;
  }

  isUpdatingProduct.value = true;

  try {
    const next = await productDetailStore.update(detail.value.item.id, {
      name,
      brand: editBrand.value.trim() || "未填写品牌",
      category,
      spec: editSpec.value.trim() || "未填写规格",
      unit,
      quantity,
      purchasePrice,
      purchaseChannel: editPurchaseChannel.value.trim(),
      location: editLocation.value.trim(),
      stockInDate: editStockInDate.value.trim(),
      isOpened: editIsOpened.value,
      notes: editNotes.value.trim() || undefined,
    });
    detail.value = next;
    isEditSheetVisible.value = false;
    uni.showToast({ title: "商品已更新", icon: "success" });
  } catch {
    showToast("商品保存失败");
  } finally {
    isUpdatingProduct.value = false;
  }
}

function openHistoryFromAction() {
  closeActionSheet();
  void openHistorySheet();
}

function goRestockFromAction() {
  closeActionSheet();
  void goRestock();
}

function confirmArchiveProduct() {
  if (!detail.value || isArchiving.value) return;

  uni.showModal({
    title: "归档商品",
    content: `确认将 ${detail.value.item.name} 从库存列表移除？历史记录会保留。`,
    confirmText: "归档",
    confirmColor: "#dc2626",
    success: (result) => {
      if (result.confirm) {
        void archiveCurrentProduct();
      }
    },
  });
}

async function archiveCurrentProduct() {
  if (!detail.value || isArchiving.value) return;

  isArchiving.value = true;

  try {
    await archiveProduct(detail.value.item.id);
    productDetailStore.drop(detail.value.item.id);
    uni.showToast({ title: "商品已归档", icon: "success" });
    uni.switchTab({ url: "/pages/inventory/inventory" });
  } catch {
    showToast("商品归档失败");
  } finally {
    isArchiving.value = false;
  }
}

function openConsumeSheet() {
  if (!detail.value) return;

  if (detail.value.item.quantity <= 0) {
    showToast("当前库存不足，无法出库");
    return;
  }

  consumeQuantity.value = Math.min(1, detail.value.item.quantity);
  consumeActionType.value = "daily";
  consumeNotes.value = "";
  isConsumeSheetVisible.value = true;
}

function closeConsumeSheet() {
  if (isConsuming.value) return;
  isConsumeSheetVisible.value = false;
}

function changeConsumeQuantity(delta: number) {
  const max = detail.value?.item.quantity ?? 1;
  const min = Math.min(1, max);
  const current = Number(consumeQuantity.value);
  consumeQuantity.value = Math.max(
    min,
    Math.min(max, (Number.isFinite(current) ? current : min) + delta),
  );
}

function normalizeConsumeQuantity() {
  const max = detail.value?.item.quantity ?? 1;
  const min = Math.min(1, max);
  const quantity = Number(consumeQuantity.value);

  consumeQuantity.value = Number.isFinite(quantity)
    ? Math.max(min, Math.min(max, quantity))
    : min;
}

function onEditOpenedChange(event: Event) {
  editIsOpened.value = (event as unknown as { detail: { value: boolean } }).detail.value;
}

async function confirmConsume() {
  if (!detail.value || isConsuming.value) return;

  const currentQuantity = detail.value.item.quantity;

  if (consumeQuantity.value > currentQuantity) {
    showToast("消耗数量不能超过当前库存");
    consumeQuantity.value = Math.min(1, currentQuantity);
    return;
  }

  isConsuming.value = true;

  try {
    const next = await productDetailStore.consume(detail.value.item.id, {
      quantity: consumeQuantity.value,
      actionType: consumeActionType.value,
      notes: consumeNotes.value.trim() || undefined,
    });
    detail.value = next;
    isConsumeSheetVisible.value = false;
    uni.showToast({ title: "已记录出库", icon: "success" });
  } catch {
    showToast("出库失败，请检查库存");
  } finally {
    isConsuming.value = false;
  }
}

function formatQuantity(batch: ProductBatchSummary) {
  return `${batch.quantity.toFixed(batch.quantity % 1 === 0 ? 0 : 1)} ${batch.unit}`;
}

async function openHistorySheet() {
  if (!detail.value) return;

  isHistorySheetVisible.value = true;
  isHistoryLoading.value = true;

  try {
    historyLogs.value = (await fetchProductLogs(detail.value.item.id)).items;
  } catch {
    showToast("历史加载失败");
  } finally {
    isHistoryLoading.value = false;
  }
}

function closeHistorySheet() {
  isHistorySheetVisible.value = false;
}

function formatLogQuantity(log: ProductStockLogSummary) {
  const prefix = log.action === "stock_in" ? "+" : "-";
  return `${prefix}${log.quantity} ${log.unit}`;
}

function formatLogTime(value: string) {
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

function clampTrendValue(value: number) {
  return Math.max(8, Math.min(92, value));
}

</script>

<template>
  <view class="detail-page">
    <view class="topbar">
      <button class="icon-button" @click="goBack">
        <wd-icon name="arrow-left" size="42rpx" />
      </button>
      <text class="topbar-title">{{ detailTitle }}</text>
      <button class="icon-button right" @click="openActionSheet">
        <wd-icon name="more" size="42rpx" />
      </button>
    </view>

    <scroll-view v-if="detail" class="content" scroll-y :show-scrollbar="false">
      <view class="hero">
        <image class="hero-image" :src="detail.item.image" mode="aspectFill" />
        <view class="hero-status" :class="heroStatus.tone">
          <wd-icon v-if="heroStatus.tone !== 'enough'" name="warning" size="24rpx" />
          <text>{{ heroStatus.text }}</text>
        </view>
      </view>

      <view class="product-card">
        <view class="tag-row">
          <text v-for="tag in detail.item.tags" :key="tag" class="tag">{{ tag }}</text>
        </view>
        <view class="product-name">{{ detail.item.name }}</view>
        <view class="product-spec">规格: {{ detail.item.spec }}</view>
      </view>

      <view class="section-title">
        <wd-icon name="list" size="34rpx" />
        <text>库存批次</text>
      </view>

      <view class="batch-list">
        <view
          v-for="batch in detail.batches"
          :key="batch.id"
          class="batch-card"
          :class="batch.status"
        >
          <view class="batch-head">
            <view class="batch-code">批次 {{ batch.batchNo }}</view>
            <view class="batch-quantity">{{ formatQuantity(batch) }}</view>
          </view>
          <view class="batch-meta">
            <text>存放位置: {{ batch.location }}</text>
            <text>{{ batch.expiryText }}</text>
          </view>
          <view class="progress-track">
            <view class="progress-fill" :style="{ width: `${batch.progress}%` }" />
          </view>
          <view class="batch-actions">
            <button class="edit-action" @click="openEditSheet">
              <wd-icon name="edit" size="26rpx" />
              <text>编辑</text>
            </button>
            <button v-if="batch.canConsume" class="consume-action" @click="openConsumeSheet">
              <wd-icon name="remove" size="26rpx" />
              <text>记录消耗</text>
            </button>
          </view>
        </view>
      </view>

      <view class="trend-card">
        <view class="trend-head">
          <view>
            <wd-icon name="chart" size="34rpx" />
            <text>消耗趋势</text>
          </view>
          <text>近30天</text>
        </view>
        <view class="trend-chart">
          <view class="trend-bars">
            <view
              v-for="(point, index) in detail.consumptionTrend"
              :key="point.label"
              class="trend-column"
            >
              <view class="trend-bar" :style="{ height: `${point.value}%` }">
                <view
                  v-if="index === detail.consumptionTrend.length - 1"
                  class="trend-bar-cap"
                />
              </view>
            </view>
          </view>
          <view class="trend-line-layer">
            <view
              v-for="segment in trendLineSegments"
              :key="segment.id"
              class="trend-line-segment"
              :style="{
                left: `${segment.left}%`,
                bottom: `${segment.bottom}%`,
                width: `${segment.width}%`,
                transform: `rotate(${segment.angle}deg)`,
              }"
            />
            <view
              v-if="trendMarker"
              class="trend-marker"
              :style="{ left: `${trendMarker.left}%`, bottom: `${trendMarker.bottom}%` }"
            />
          </view>
        </view>
        <view class="trend-axis">
          <text>{{ firstTrendLabel }}</text>
          <text>{{ lastTrendLabel }}</text>
        </view>
      </view>
    </scroll-view>

    <view v-else-if="loadError" class="loading">
      <wd-icon name="warning" size="68rpx" />
      <text>{{ loadError }}</text>
      <button @click="goBack">返回库存</button>
    </view>
    <view v-else class="loading">加载中...</view>

    <view v-if="isConsumeSheetVisible && detail" class="sheet-mask" @click="closeConsumeSheet">
      <view class="consume-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-head">
          <text>记录消耗</text>
          <button @click="closeConsumeSheet">
            <wd-icon name="close" size="42rpx" />
          </button>
        </view>

        <scroll-view class="consume-sheet-body" scroll-y :show-scrollbar="false">
          <view class="sheet-product">
            <image :src="detail.item.image" mode="aspectFill" />
            <view>
              <view class="sheet-product-name">{{ detail.item.name }}</view>
              <view class="sheet-product-spec">规格: {{ detail.item.spec }}</view>
              <view class="stock-pill">当前库存: {{ detail.item.quantity }} {{ detail.item.unit }}</view>
            </view>
          </view>

          <view class="quantity-card">
            <view class="quantity-label">消耗数量</view>
            <view class="quantity-row">
              <button @click="changeConsumeQuantity(-1)">
                <wd-icon name="remove" size="48rpx" />
              </button>
              <input
                v-model.number="consumeQuantity"
                type="digit"
                class="consume-quantity-input"
                @blur="normalizeConsumeQuantity"
              />
              <button @click="changeConsumeQuantity(1)">
                <wd-icon name="add" size="48rpx" />
              </button>
            </view>
          </view>

          <view class="sheet-section-title">操作类型</view>
          <view class="consume-type-grid">
            <button
              v-for="type in consumeActionTypes"
              :key="type.id"
              :class="{ active: consumeActionType === type.id }"
              @click="consumeActionType = type.id"
            >
              {{ type.label }}
            </button>
          </view>

          <view class="sheet-section-title">备注说明</view>
          <textarea
            v-model="consumeNotes"
            class="consume-notes"
            maxlength="80"
            placeholder="选填，记录特殊情况..."
          />
        </scroll-view>

        <view class="consume-footer">
          <button class="confirm-consume" :disabled="isConsuming" @click="confirmConsume">
            <wd-icon name="check-circle" size="38rpx" />
            <text>确认出库</text>
          </button>
        </view>
      </view>
    </view>

    <view v-if="isHistorySheetVisible && detail" class="sheet-mask" @click="closeHistorySheet">
      <view class="history-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-head">
          <text>库存历史</text>
          <button @click="closeHistorySheet">
            <wd-icon name="close" size="42rpx" />
          </button>
        </view>

        <view v-if="isHistoryLoading" class="history-empty">加载中...</view>
        <view v-else-if="!historyLogs.length" class="history-empty">暂无出入库记录</view>
        <scroll-view v-else class="history-list" scroll-y :show-scrollbar="false">
          <view v-for="log in historyLogs" :key="log.id" class="history-row">
            <view class="history-icon" :class="log.action">
              <wd-icon :name="log.action === 'stock_in' ? 'arrow-up' : 'arrow-down'" size="30rpx" />
            </view>
            <view class="history-main">
              <view class="history-title">{{ log.actionText }}</view>
              <view class="history-meta">{{ formatLogTime(log.operatedAt) }} · {{ log.operatorName }}</view>
              <view v-if="log.notes" class="history-notes">{{ log.notes }}</view>
            </view>
            <view class="history-quantity" :class="log.action">{{ formatLogQuantity(log) }}</view>
          </view>
        </scroll-view>
      </view>
    </view>

    <view v-if="isActionSheetVisible && detail" class="sheet-mask" @click="closeActionSheet">
      <view class="action-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-head">
          <text>更多操作</text>
          <button @click="closeActionSheet">
            <wd-icon name="close" size="42rpx" />
          </button>
        </view>

        <view class="action-list">
          <button @click="openEditSheet">
            <wd-icon name="edit" size="34rpx" />
            <text>编辑商品</text>
          </button>
          <button @click="openHistoryFromAction">
            <wd-icon name="time" size="34rpx" />
            <text>查看历史</text>
          </button>
          <button :disabled="isAddingRestock" @click="goRestockFromAction">
            <wd-icon name="cart" size="34rpx" />
            <text>{{ isAddingRestock ? "加入中" : "加入补货" }}</text>
          </button>
          <button @click="copyProductName">
            <wd-icon name="file-copy" size="34rpx" />
            <text>复制名称</text>
          </button>
          <button class="danger" :disabled="isArchiving" @click="confirmArchiveProduct">
            <wd-icon name="delete" size="34rpx" />
            <text>{{ isArchiving ? "归档中" : "归档商品" }}</text>
          </button>
        </view>
      </view>
    </view>

    <view v-if="isEditSheetVisible && detail" class="sheet-mask" @click="closeEditSheet">
      <view class="edit-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-head">
          <text>编辑商品</text>
          <button @click="closeEditSheet">
            <wd-icon name="close" size="42rpx" />
          </button>
        </view>

        <scroll-view class="edit-sheet-body" scroll-y :show-scrollbar="false">
          <view class="sheet-product">
            <image :src="detail.item.image" mode="aspectFill" />
            <view>
              <view class="sheet-product-name">{{ detail.item.name }}</view>
              <view class="sheet-product-spec">当前库存: {{ detail.item.quantity }} {{ detail.item.unit }}</view>
            </view>
          </view>

          <view class="edit-form">
            <view class="edit-field full">
              <text>商品名称</text>
              <input v-model="editName" maxlength="40" placeholder="请输入商品名称" />
            </view>
            <view class="edit-field">
              <text>品牌</text>
              <input v-model="editBrand" maxlength="24" placeholder="品牌" />
            </view>
            <view class="edit-field">
              <text>分类</text>
              <input v-model="editCategory" maxlength="16" placeholder="分类" />
            </view>
            <view class="edit-field full">
              <text>规格</text>
              <input v-model="editSpec" maxlength="32" placeholder="规格，如 5.4kg/袋" />
            </view>
            <view class="edit-field">
              <text>单位</text>
              <input v-model="editUnit" maxlength="8" placeholder="袋/罐/包" />
            </view>
            <view class="edit-field">
              <text>购入价格</text>
              <input v-model="editPurchasePrice" type="number" placeholder="0.00" />
            </view>
            <view class="edit-field">
              <text>购入渠道</text>
              <input v-model="editPurchaseChannel" maxlength="20" placeholder="如 天猫/京东" />
            </view>
            <view class="edit-field full">
              <text>存放位置</text>
              <input v-model="editLocation" maxlength="32" placeholder="如 客厅储物柜" />
            </view>
            <view class="edit-field">
              <text>入库日期</text>
              <input v-model="editStockInDate" maxlength="10" placeholder="YYYY-MM-DD" />
            </view>
            <view class="edit-field edit-switch-field">
              <text>开封状态</text>
              <view>
                <text>{{ editIsOpened ? "已开封" : "未开封" }}</text>
                <switch color="#18B981" :checked="editIsOpened" @change="onEditOpenedChange" />
              </view>
            </view>
          </view>

          <view class="quantity-card">
            <view class="quantity-label">当前库存</view>
            <view class="quantity-row">
              <button @click="changeEditQuantity(-1)">
                <wd-icon name="minus-circle" size="48rpx" />
              </button>
              <input v-model.number="editQuantity" type="number" />
              <button @click="changeEditQuantity(1)">
                <wd-icon name="add-circle" size="48rpx" />
              </button>
            </view>
            <view class="quantity-unit">{{ editUnit || detail.item.unit }}</view>
          </view>

          <textarea
            v-model="editNotes"
            class="consume-notes"
            maxlength="80"
            placeholder="选填，记录调整原因..."
          />

          <button class="confirm-consume" :disabled="isUpdatingProduct" @click="confirmProductUpdate">
            <wd-icon name="check-circle" size="38rpx" />
            <text>{{ isUpdatingProduct ? "保存中" : "保存商品" }}</text>
          </button>
        </scroll-view>
      </view>
    </view>

    <view class="bottom-actions safe-area-bottom">
      <button class="secondary" @click="openHistorySheet">
        <wd-icon name="history" size="34rpx" />
        <text>查看历史</text>
      </button>
      <button class="primary" :disabled="isAddingRestock" @click="goRestock">
        <wd-icon name="cart" size="34rpx" />
        <text>{{ isAddingRestock ? "加入中" : "再次购买" }}</text>
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.detail-page {
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
  padding: 0 40rpx;
  background: $color-bg-page;
  color: $color-primary;
}

.icon-button {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.icon-button.right {
  justify-content: flex-end;
}

.topbar-title {
  max-width: 480rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 32rpx;
  font-weight: $font-weight-bold;
  line-height: 42rpx;
  color: $color-text-primary;
}

.content {
  height: calc(100vh - 96rpx);
  padding-bottom: 170rpx;
}

.hero {
  position: relative;
  height: 422rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, #eef4ef 0%, #ffffff 55%, #e8f8f2 100%);
}

.hero-image {
  width: 100%;
  height: 100%;
}

.hero-status {
  position: absolute;
  top: 44rpx;
  right: 44rpx;
  min-width: 104rpx;
  height: 46rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border-radius: $radius-full;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.hero-status.enough {
  background: $color-primary-bg;
  color: $color-primary;
}

.hero-status.low {
  background: $color-warning-bg;
  color: $color-warning;
}

.hero-status.empty {
  background: $color-danger-bg;
  color: $color-danger;
}

.product-card {
  padding: 34rpx 28rpx 42rpx;
  border-radius: 0 0 22rpx 22rpx;
  background: #ffffff;
  box-shadow: $shadow-sm;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.tag {
  height: 46rpx;
  display: flex;
  align-items: center;
  padding: 0 18rpx;
  border-radius: 8rpx;
  background: $color-primary-bg;
  color: $color-primary-light;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.product-name {
  margin-top: 28rpx;
  font-size: 44rpx;
  font-weight: $font-weight-bold;
  line-height: 60rpx;
  color: $color-text-primary;
}

.product-spec {
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 36rpx;
  color: $color-text-secondary;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin: 42rpx 28rpx 24rpx;
  color: $color-primary;
}

.section-title text {
  font-size: 34rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.batch-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  padding: 0 28rpx;
}

.batch-card {
  padding: 28rpx;
  border: 2rpx solid transparent;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: $shadow-md;
}

.batch-card.warning {
  border-color: rgba(217, 119, 6, 0.22);
  background: #fffefa;
}

.batch-head,
.batch-meta,
.batch-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.batch-code {
  min-height: 44rpx;
  display: flex;
  align-items: center;
  padding: 0 16rpx;
  border-radius: 8rpx;
  background: $color-warning-bg;
  color: $color-warning;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.batch-card.normal .batch-code {
  background: #d9eff0;
  color: $color-text-secondary;
}

.batch-quantity {
  font-size: 34rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.batch-meta {
  margin-top: 22rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: $color-text-secondary;
}

.batch-card.warning .batch-meta text:last-child {
  color: $color-danger;
}

.progress-track {
  height: 14rpx;
  margin-top: 28rpx;
  border-radius: $radius-full;
  overflow: hidden;
  background: #d9eff0;
}

.progress-fill {
  height: 100%;
  border-radius: $radius-full;
  background: $color-primary-light;
}

.batch-card.warning .progress-fill {
  background: $color-warning;
}

.batch-actions {
  justify-content: flex-end;
  gap: 16rpx;
  margin-top: 28rpx;
}

.batch-actions button {
  min-width: 128rpx;
  height: 58rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border-radius: 14rpx;
  background: $color-primary-bg;
  color: $color-primary;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.batch-actions .consume-action {
  background: #d9eff0;
}

.trend-card {
  margin: 34rpx 28rpx 0;
  padding: 30rpx;
  border-radius: 20rpx;
  background: #ffffff;
  box-shadow: $shadow-md;
}

.trend-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: $color-text-secondary;
  font-size: 24rpx;
}

.trend-head > view {
  display: flex;
  align-items: center;
  gap: 14rpx;
  color: $color-primary;
}

.trend-head view text {
  font-size: 32rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.trend-chart {
  position: relative;
  height: 230rpx;
  margin-top: 36rpx;
}

.trend-bars,
.trend-line-layer {
  position: absolute;
  inset: 0;
}

.trend-bars {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
}

.trend-column {
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.trend-bar {
  min-height: 32rpx;
  border-radius: 6rpx 6rpx 0 0;
  background: linear-gradient(180deg, $color-primary-light 0%, #bfeede 100%);
}

.trend-column:last-child .trend-bar {
  position: relative;
  background: $color-primary-light;
}

.trend-bar-cap {
  position: absolute;
  top: -18rpx;
  left: 50%;
  width: 40rpx;
  height: 20rpx;
  border-radius: $radius-full;
  background: $color-primary-light;
  transform: translateX(-50%);
}

.trend-line-layer {
  pointer-events: none;
  z-index: 2;
}

.trend-line-segment {
  position: absolute;
  height: 6rpx;
  border-radius: $radius-full;
  background: $color-primary-light;
  transform-origin: 0 50%;
}

.trend-marker {
  position: absolute;
  width: 22rpx;
  height: 22rpx;
  border: 6rpx solid $color-primary-light;
  border-radius: $radius-full;
  background: #ffffff;
  transform: translate(-50%, 50%);
}

.trend-axis {
  display: flex;
  justify-content: space-between;
  margin-top: 14rpx;
  padding: 0 8rpx;
}

.trend-axis text {
  font-size: 22rpx;
  color: $color-text-secondary;
}

.loading {
  height: calc(100vh - 260rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22rpx;
  color: $color-text-secondary;
  font-size: 28rpx;
}

.loading button {
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 34rpx;
  border-radius: 16rpx;
  background: $color-primary;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: $font-weight-bold;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: $z-modal-mask;
  display: flex;
  align-items: flex-end;
  background: rgba(10, 31, 33, 0.48);
  backdrop-filter: blur(12rpx);
}

.consume-sheet,
.history-sheet,
.action-sheet,
.edit-sheet {
  width: 100%;
  max-height: 78vh;
  padding: 22rpx 28rpx 28rpx;
  border-radius: 28rpx 28rpx 0 0;
  background: #ffffff;
  box-shadow: 0 -16rpx 48rpx rgba(21, 61, 53, 0.18);
}

.consume-sheet {
  height: 70vh;
  max-height: 1236rpx;
  display: flex;
  flex-direction: column;
  padding-right: 0;
  padding-bottom: 0;
  padding-left: 0;
}

.consume-sheet .sheet-handle {
  margin-bottom: 32rpx;
}

.consume-sheet .sheet-head {
  padding: 0 28rpx 32rpx;
  border-bottom: 2rpx solid $color-border;
}

.consume-sheet-body {
  min-height: 0;
  flex: 1;
  padding: 32rpx 28rpx 28rpx;
}

.consume-footer {
  flex: 0 0 auto;
  padding: 24rpx 28rpx 30rpx;
  border-top: 2rpx solid $color-border;
  background: #ffffff;
}

.consume-footer .confirm-consume {
  height: 96rpx;
  margin-top: 0;
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

.sheet-product {
  min-height: 154rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-top: 36rpx;
  padding: 24rpx;
  border: 2rpx solid $color-border;
  border-radius: 18rpx;
  background: $color-bg-page;
}

.consume-sheet .sheet-product {
  min-height: 208rpx;
  gap: 28rpx;
  margin-top: 0;
  padding: 28rpx;
  border-radius: 16rpx;
}

.sheet-product image {
  width: 100rpx;
  height: 100rpx;
  flex: 0 0 100rpx;
  border-radius: 14rpx;
  background: #ffffff;
}

.consume-sheet .sheet-product image {
  width: 128rpx;
  height: 128rpx;
  flex-basis: 128rpx;
}

.sheet-product-name {
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  line-height: 40rpx;
  color: $color-text-primary;
}

.sheet-product-spec {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $color-text-secondary;
}

.stock-pill {
  display: inline-flex;
  align-items: center;
  height: 42rpx;
  margin-top: 12rpx;
  padding: 0 14rpx;
  border-radius: 8rpx;
  background: $color-accent-bg;
  color: $color-accent;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.edit-sheet-body {
  max-height: 64vh;
  margin-top: 28rpx;
}

.edit-sheet-body .sheet-product {
  margin-top: 0;
}

.edit-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22rpx;
  margin-top: 28rpx;
}

.edit-field {
  min-width: 0;
  padding: 20rpx 22rpx;
  border: 2rpx solid $color-border;
  border-radius: 16rpx;
  background: $color-bg-page;
}

.edit-field.full {
  grid-column: 1 / -1;
}

.edit-field text {
  display: block;
  font-size: 22rpx;
  line-height: 30rpx;
  color: $color-text-secondary;
}

.edit-field input {
  height: 54rpx;
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.edit-switch-field > view {
  height: 62rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
  margin-top: 8rpx;
}

.edit-switch-field > view text {
  font-size: 26rpx;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.quantity-card {
  min-height: 236rpx;
  margin-top: 38rpx;
  padding: 36rpx;
  border: 2rpx solid $color-border;
  border-radius: 16rpx;
  background: #ffffff;
}

.quantity-label {
  text-align: center;
  font-size: 26rpx;
  line-height: 34rpx;
  color: $color-text-secondary;
}

.quantity-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin-top: 26rpx;
}

.quantity-row button {
  color: $color-text-secondary;
}

.consume-sheet .quantity-row button {
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid $color-border;
  border-radius: $radius-full;
}

.quantity-row text,
.quantity-row input {
  min-width: 120rpx;
  text-align: center;
  font-size: 50rpx;
  font-weight: $font-weight-bold;
  color: $color-primary;
}

.quantity-row input {
  height: 72rpx;
}

.consume-quantity-input {
  width: 120rpx;
  padding: 0;
  border: 0;
  background: transparent;
}

.quantity-unit {
  margin-top: 8rpx;
  text-align: center;
  font-size: 24rpx;
  color: $color-text-secondary;
}

.sheet-section-title {
  margin-top: 40rpx;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  line-height: 40rpx;
  color: $color-text-primary;
}

.consume-type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 22rpx;
  margin-top: 22rpx;
}

.consume-type-grid button {
  min-width: 170rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 28rpx;
  border: 2rpx solid $color-border;
  border-radius: $radius-full;
  background: #ffffff;
  color: $color-text-secondary;
  font-size: 28rpx;
  font-weight: $font-weight-medium;
}

.consume-type-grid button.active {
  border-color: $color-primary;
  background: $color-primary-bg;
  color: $color-primary;
}

.consume-notes {
  width: 100%;
  height: 136rpx;
  margin-top: 28rpx;
  padding: 22rpx;
  border: 2rpx solid $color-border;
  border-radius: 18rpx;
  background: $color-bg-page;
  color: $color-text-primary;
  font-size: 28rpx;
  line-height: 40rpx;
}

.confirm-consume {
  width: 100%;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-top: 48rpx;
  border-radius: 16rpx;
  background: $color-primary-light;
  color: #ffffff;
  font-size: 34rpx;
  font-weight: $font-weight-bold;
}

.history-list {
  max-height: 520rpx;
  margin-top: 26rpx;
}

.history-row {
  min-height: 112rpx;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 24rpx 0;
  border-bottom: 2rpx solid $color-border;
}

.history-row:last-child {
  border-bottom: 0;
}

.history-icon {
  width: 54rpx;
  height: 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 54rpx;
  border-radius: $radius-full;
  background: $color-primary-bg;
  color: $color-primary;
}

.history-icon.stock_out,
.history-icon.adjust,
.history-icon.expired,
.history-icon.gift {
  background: $color-warning-bg;
  color: $color-warning;
}

.history-main {
  min-width: 0;
  flex: 1;
}

.history-title {
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  line-height: 40rpx;
  color: $color-text-primary;
}

.history-meta,
.history-notes {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: $color-text-secondary;
}

.history-notes {
  color: $color-text-primary;
}

.history-quantity {
  flex: 0 0 auto;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  color: $color-primary;
}

.history-quantity.stock_out,
.history-quantity.adjust,
.history-quantity.expired,
.history-quantity.gift {
  color: $color-warning;
}

.history-empty {
  min-height: 260rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-text-secondary;
  font-size: 28rpx;
}

.action-list {
  display: flex;
  flex-direction: column;
  margin-top: 26rpx;
  border: 2rpx solid $color-border;
  border-radius: 18rpx;
  overflow: hidden;
}

.action-list button {
  min-height: 96rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 0 28rpx;
  border-bottom: 2rpx solid $color-border;
  color: $color-text-primary;
  font-size: 30rpx;
  font-weight: $font-weight-medium;
}

.action-list button:last-child {
  border-bottom: 0;
}

.action-list button.danger {
  color: $color-danger;
}

.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-fixed;
  display: flex;
  gap: 20rpx;
  padding: 24rpx 28rpx;
  border-top: 2rpx solid $color-border;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12rpx);
}

.bottom-actions button {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border-radius: 20rpx;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
}

.bottom-actions .secondary {
  flex: 1;
  background: $color-primary-bg;
  color: $color-text-primary;
}

.bottom-actions .primary {
  flex: 2;
  background: $color-primary;
  color: #ffffff;
}
</style>
