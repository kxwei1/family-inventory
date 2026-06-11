<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import type { InventoryProductSummary } from "@family-inventory/shared-types";
import { fetchProducts, stockInProduct } from "@/services/inventoryApi";

type ScanMode = "barcode" | "package";

interface RecognizedProduct {
  name: string;
  category: string;
  brand: string;
  spec: string;
  unit: string;
  quantity: number;
  purchasePrice?: number;
  image: string;
}

const activeMode = ref<ScanMode>("barcode");
const isScanning = ref(false);
const isSaving = ref(false);
const recognizedProduct = ref<RecognizedProduct | null>(null);
const recentProducts = ref<InventoryProductSummary[]>([]);

const modes: Array<{ id: ScanMode; label: string }> = [
  { id: "barcode", label: "扫条码" },
  { id: "package", label: "扫包装" },
];

const scanHint = computed(() => {
  if (isScanning.value) return "正在识别...";

  return activeMode.value === "package"
    ? "将包装正面放入框内，即可自动识别"
    : "将条形码放入框内，即可自动扫描";
});

const demoByMode: Record<ScanMode, RecognizedProduct> = {
  barcode: {
    name: "皇家幼猫粮 2kg",
    category: "猫粮",
    brand: "Royal Canin",
    spec: "2kg/袋",
    unit: "袋",
    quantity: 1,
    purchasePrice: 128,
    image: "/static/products/royal-kitten-food.jpg",
  },
  package: {
    name: "巅峰牛肉主食罐",
    category: "罐头",
    brand: "Ziwi Peak",
    spec: "170g/罐",
    unit: "罐",
    quantity: 6,
    purchasePrice: 28.9,
    image: "/static/products/ziwi.png",
  },
};

onShow(() => {
  void loadRecentProducts();
});

async function loadRecentProducts() {
  try {
    recentProducts.value = (await fetchProducts()).items.slice(0, 4);
  } catch {
    uni.showToast({ title: "最近添加加载失败", icon: "none" });
  }
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: "/pages/home/home" }),
  });
}

function setMode(mode: ScanMode) {
  activeMode.value = mode;
  recognizedProduct.value = null;
}

function startScan() {
  if (isScanning.value) return;

  isScanning.value = true;

  if (activeMode.value === "package") {
    simulateRecognition();
    return;
  }

  if (typeof uni.scanCode === "function") {
    uni.scanCode({
      scanType: ["barCode", "qrCode"],
      success: (result) => {
        recognizedProduct.value = {
          ...demoByMode[activeMode.value],
          spec: `${demoByMode[activeMode.value].spec} · ${result.result.slice(-6)}`,
        };
      },
      fail: () => simulateRecognition(),
      complete: () => {
        isScanning.value = false;
      },
    });
    return;
  }

  simulateRecognition();
}

function simulateRecognition() {
  setTimeout(() => {
    recognizedProduct.value = demoByMode[activeMode.value];
    isScanning.value = false;
  }, 650);
}

async function confirmStockIn() {
  if (!recognizedProduct.value || isSaving.value) return;

  isSaving.value = true;

  try {
    const product = recognizedProduct.value;
    const response = await stockInProduct({
      name: product.name,
      category: product.category,
      brand: product.brand,
      spec: product.spec,
      unit: product.unit,
      quantity: product.quantity,
      purchasePrice: product.purchasePrice,
      purchaseChannel: "扫码入库",
      location: "待整理",
      image: product.image,
      stockInDate: new Date().toISOString().slice(0, 10),
    });

    recentProducts.value = [
      response.item,
      ...recentProducts.value.filter((item) => item.id !== response.item.id),
    ].slice(0, 4);
    recognizedProduct.value = null;
    uni.showToast({ title: "已识别并入库", icon: "success" });
  } catch {
    uni.showToast({ title: "扫码入库失败", icon: "none" });
  } finally {
    isSaving.value = false;
  }
}

function goManualInput() {
  uni.switchTab({ url: "/pages/add/add" });
}

function goInventory() {
  uni.switchTab({ url: "/pages/inventory/inventory" });
}

function openProduct(product: InventoryProductSummary) {
  uni.navigateTo({ url: `/pages/product-detail/product-detail?id=${encodeURIComponent(product.id)}` });
}

</script>

<template>
  <view class="stock-in-page">
    <view class="camera-bg">
      <image class="camera-product" src="/static/products/royal-kitten-food.jpg" mode="aspectFill" />
    </view>
    <view class="camera-overlay" />

    <view class="topbar">
      <button class="round-button" @click="goBack">
        <wd-icon name="close" size="42rpx" />
      </button>
      <view class="mode-switch">
        <button
          v-for="mode in modes"
          :key="mode.id"
          :class="{ active: activeMode === mode.id }"
          @click="setMode(mode.id)"
        >
          {{ mode.label }}
        </button>
      </view>
      <view class="topbar-spacer" />
    </view>

    <view class="scanner-stage">
      <button class="scan-frame" :class="{ scanning: isScanning }" @click="startScan">
        <view class="scan-spotlight" />
        <view class="corner top-left" />
        <view class="corner top-right" />
        <view class="corner bottom-left" />
        <view class="corner bottom-right" />
        <view class="scan-line" />
      </button>
      <text class="scan-hint">
        {{ scanHint }}
      </text>
    </view>

    <view v-if="recognizedProduct" class="result-card">
      <image :src="recognizedProduct.image" mode="aspectFit" />
      <view class="result-main">
        <text class="result-label">识别结果</text>
        <text class="result-name">{{ recognizedProduct.name }}</text>
        <text class="result-meta">{{ recognizedProduct.brand }} · {{ recognizedProduct.spec }}</text>
      </view>
      <button :disabled="isSaving" @click="confirmStockIn">
        {{ isSaving ? "入库中" : "确认入库" }}
      </button>
    </view>

    <view class="recent-card safe-area-bottom">
      <view class="recent-head">
        <text>最近添加</text>
        <button @click="goInventory">查看全部 &gt;</button>
      </view>
      <scroll-view class="recent-scroll" scroll-x :show-scrollbar="false">
        <button
          v-for="product in recentProducts"
          :key="product.id"
          class="recent-item"
          @click="openProduct(product)"
        >
          <image :src="product.image" mode="aspectFit" />
        </button>
        <button class="recent-add" @click="goManualInput">
          <wd-icon name="add" size="34rpx" />
        </button>
      </scroll-view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.stock-in-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;
  background: #050b0c;
  color: #ffffff;
}

.camera-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 48%, rgba(255, 255, 255, 0.14) 0 24%, rgba(255, 255, 255, 0) 36%),
    linear-gradient(135deg, #242826 0%, #111716 52%, #050606 100%);
}

.camera-product {
  width: 100%;
  height: 100%;
  opacity: 0.58;
  filter: blur(2rpx);
  transform: scale(1.16);
}

.camera-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
}

.topbar {
  position: relative;
  z-index: 2;
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 30rpx 0;
}

.round-button,
.topbar-spacer {
  width: 72rpx;
  height: 72rpx;
}

.round-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
  backdrop-filter: blur(16rpx);
}

.mode-switch {
  display: flex;
  gap: 6rpx;
  padding: 6rpx;
  border-radius: $radius-full;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(16rpx);
}

.mode-switch button {
  height: 54rpx;
  min-width: 116rpx;
  padding: 0 24rpx;
  border-radius: $radius-full;
  color: rgba(255, 255, 255, 0.88);
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.mode-switch button.active {
  background: #ffffff;
  color: $color-text-primary;
}

.scanner-stage {
  position: relative;
  z-index: 1;
  min-height: 0;
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-bottom: 20rpx;
}

.scan-spotlight {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 0;
  width: 500rpx;
  height: 500rpx;
  border-radius: 0;
  background: rgba(255, 255, 255, 0.44);
  box-shadow:
    inset 0 0 70rpx rgba(255, 255, 255, 0.18),
    0 0 60rpx rgba(0, 0, 0, 0.12);
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.scan-frame {
  position: relative;
  z-index: 1;
  width: 520rpx;
  height: 520rpx;
}

.corner {
  position: absolute;
  width: 64rpx;
  height: 64rpx;
  border-color: $color-primary-light;
  border-style: solid;
}

.top-left {
  top: 0;
  left: 0;
  border-width: 8rpx 0 0 8rpx;
  border-radius: 16rpx 0 0;
}

.top-right {
  top: 0;
  right: 0;
  border-width: 8rpx 8rpx 0 0;
  border-radius: 0 16rpx 0 0;
}

.bottom-left {
  bottom: 0;
  left: 0;
  border-width: 0 0 8rpx 8rpx;
  border-radius: 0 0 0 16rpx;
}

.bottom-right {
  right: 0;
  bottom: 0;
  border-width: 0 8rpx 8rpx 0;
  border-radius: 0 0 16rpx;
}

.scan-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 24rpx;
  height: 8rpx;
  border-radius: $radius-full;
  background: linear-gradient(
    180deg,
    rgba(234, 243, 255, 0),
    #eaf3ff 48%,
    rgba(234, 243, 255, 0)
  );
  box-shadow: 0 0 18rpx rgba(234, 243, 255, 0.9);
  animation: scan 2s infinite linear;
}

.scan-frame.scanning .scan-line {
  animation-duration: 1s;
}

@keyframes scan {
  0% {
    transform: translateY(0);
    opacity: 0;
  }

  12%,
  88% {
    opacity: 1;
  }

  100% {
    transform: translateY(488rpx);
    opacity: 0;
  }
}

.scan-hint {
  position: relative;
  z-index: 1;
  margin-top: 58rpx;
  color: rgba(255, 255, 255, 0.82);
  font-size: 26rpx;
  line-height: 36rpx;
}

.result-card,
.recent-card {
  position: relative;
  z-index: 2;
  margin: 0 30rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.2);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(22rpx);
}

.result-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 22rpx;
}

.result-card image {
  width: 92rpx;
  height: 92rpx;
  flex: 0 0 92rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.88);
}

.result-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.result-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.68);
}

.result-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
}

.result-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.72);
}

.result-card button {
  width: 136rpx;
  height: 64rpx;
  border-radius: 16rpx;
  background: $color-primary-light;
  color: #ffffff;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.recent-add {
  width: 112rpx;
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid rgba(255, 255, 255, 0.22);
  border-radius: $radius-full;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(16rpx);
}

.recent-card {
  padding: 32rpx;
}

.recent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.recent-head text {
  font-size: 36rpx;
  font-weight: $font-weight-bold;
}

.recent-head button {
  color: rgba(255, 255, 255, 0.72);
  font-size: 24rpx;
}

.recent-scroll {
  white-space: nowrap;
}

.recent-item {
  width: 128rpx;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  margin-right: 28rpx;
  vertical-align: top;
}

.recent-item image {
  width: 128rpx;
  height: 128rpx;
  border-radius: 18rpx;
  background: rgba(255, 255, 255, 0.82);
}

.recent-add {
  display: inline-flex;
  width: 128rpx;
  height: 128rpx;
  border-style: dashed;
  border-radius: 18rpx;
  color: rgba(255, 255, 255, 0.84);
  vertical-align: top;
}
</style>
