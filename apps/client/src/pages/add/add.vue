<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import AppTabBar from "@/components/AppTabBar.vue";
import { createProduct } from "@/services/inventoryApi";

const productName = ref("");
const brand = ref("");
const spec = ref("");
const flavor = ref("");
const purchasePrice = ref("");
const location = ref("");
const productImage = ref("");
const selectedCategory = ref("狗粮");
const selectedChannel = ref("淘宝");
const quantity = ref(1);
const opened = ref(false);
const isSaving = ref(false);
const stockInDate = ref(todayDate());

const categories = ["狗粮", "猫粮", "零食", "保健品", "用品"];
const channels = ["淘宝", "京东", "线下门店", "其他"];
const unitByCategory: Record<string, string> = {
  狗粮: "袋",
  猫粮: "袋",
  零食: "袋",
  保健品: "盒",
  用品: "件",
};
onShow(() => {
  uni.hideTabBar({ animation: false });
});

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function changeQuantity(delta: number) {
  quantity.value = Math.max(1, quantity.value + delta);
}

async function save(continueAdding: boolean) {
  const name = productName.value.trim();
  const parsedPrice = parsePrice();

  if (!name) {
    uni.showToast({ title: "请输入商品名称", icon: "none" });
    return;
  }

  if (parsedPrice === null) {
    uni.showToast({ title: "请输入有效的购入价格", icon: "none" });
    return;
  }

  if (isSaving.value) return;

  isSaving.value = true;

  try {
    await createProduct({
      name,
      category: selectedCategory.value,
      brand: brand.value.trim() || undefined,
      spec: buildSpec(),
      unit: unitByCategory[selectedCategory.value] ?? "件",
      quantity: quantity.value,
      purchasePrice: parsedPrice,
      purchaseChannel: selectedChannel.value,
      location: location.value.trim() || undefined,
      isOpened: opened.value,
      image: productImage.value || undefined,
      stockInDate: stockInDate.value,
    });

    uni.showToast({ title: "已保存商品", icon: "success" });

    if (continueAdding) {
      resetForm();
      return;
    }

    uni.switchTab({ url: "/pages/inventory/inventory" });
  } catch {
    uni.showToast({ title: "商品保存失败", icon: "none" });
  } finally {
    isSaving.value = false;
  }
}

function buildSpec() {
  const parts = [spec.value.trim(), flavor.value.trim()].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

function parsePrice() {
  if (!purchasePrice.value.trim()) return undefined;

  const value = Number(purchasePrice.value);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function resetForm() {
  productName.value = "";
  brand.value = "";
  spec.value = "";
  flavor.value = "";
  purchasePrice.value = "";
  location.value = "";
  productImage.value = "";
  selectedCategory.value = categories[0];
  selectedChannel.value = channels[0];
  quantity.value = 1;
  opened.value = false;
  stockInDate.value = todayDate();
}

function chooseProductImage() {
  if (isSaving.value) return;

  if (typeof uni.chooseImage !== "function") {
    uni.showToast({ title: "当前环境不支持选择图片", icon: "none" });
    return;
  }

  uni.chooseImage({
    count: 1,
    sourceType: ["album", "camera"],
    success: (result) => {
      const image = Array.isArray(result.tempFilePaths) ? result.tempFilePaths[0] : "";

      if (image) {
        productImage.value = image;
      }
    },
    fail: () => {
      uni.showToast({ title: "图片选择失败", icon: "none" });
    },
  });
}

function clearProductImage() {
  productImage.value = "";
}

function onOpenedChange(event: Event) {
  opened.value = (event as unknown as { detail: { value: boolean } }).detail.value;
}

function onStockInDateChange(event: { detail: { value: string } }) {
  if (event.detail.value) {
    stockInDate.value = event.detail.value;
  }
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: "/pages/inventory/inventory" }),
  });
}
</script>

<template>
  <view class="add-page">
    <view class="topbar">
      <button class="icon-button" @click="goBack">
        <wd-icon name="arrow-left" size="38rpx" />
      </button>
      <text class="topbar-title">添加商品</text>
      <button class="save-link" :disabled="isSaving" @click="save(false)">保存</button>
    </view>

    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <view class="upload-wrap">
        <button class="upload-card" :class="{ 'has-image': productImage }" @click="chooseProductImage">
          <image v-if="productImage" class="upload-preview" :src="productImage" mode="aspectFill" />
          <view v-if="productImage" class="upload-overlay">
            <wd-icon name="edit" size="38rpx" />
            <text>更换图片</text>
          </view>
          <template v-else>
            <wd-icon name="camera" size="58rpx" />
            <text>上传商品图片</text>
          </template>
        </button>
        <button v-if="productImage" class="remove-image" @click="clearProductImage">
          <wd-icon name="close" size="28rpx" />
        </button>
      </view>

      <view class="form-card">
        <view class="card-title">基础信息</view>

        <view class="field column">
          <label>商品名称 <text>*</text></label>
          <input v-model="productName" placeholder="请输入商品名称" />
        </view>

        <view class="field column">
          <label>分类</label>
          <view class="chip-wrap">
            <button
              v-for="category in categories"
              :key="category"
              class="chip"
              :class="{ active: selectedCategory === category }"
              @click="selectedCategory = category"
            >
              {{ category }}
            </button>
          </view>
        </view>

        <view class="field row">
          <label>品牌</label>
          <input v-model="brand" placeholder="如：渴望、巅峰" />
        </view>

        <view class="field row">
          <label>规格</label>
          <input v-model="spec" placeholder="如：1.5kg" />
        </view>

        <view class="field row last">
          <label>口味</label>
          <input v-model="flavor" placeholder="选填，如：鸡肉味" />
        </view>
      </view>

      <view class="form-card">
        <view class="card-title">首批入库信息</view>

        <view class="field stepper-row">
          <label>数量</label>
          <view class="stepper">
            <button @click="changeQuantity(-1)">
              <wd-icon name="remove" size="34rpx" />
            </button>
            <text>{{ quantity }}</text>
            <button class="plus" @click="changeQuantity(1)">
              <wd-icon name="add" size="34rpx" />
            </button>
          </view>
        </view>

        <view class="field row">
          <label>入库日期</label>
          <picker
            class="field-picker"
            mode="date"
            :value="stockInDate"
            @change="onStockInDateChange"
          >
            <view class="field-value">
              <text>{{ stockInDate }}</text>
              <wd-icon name="calendar" size="34rpx" />
            </view>
          </picker>
        </view>

        <view class="field row">
          <label>购入单价</label>
          <view class="price-input">
            <text>¥</text>
            <input v-model="purchasePrice" type="number" placeholder="0.00" />
          </view>
        </view>

        <view class="field column">
          <label>购入渠道</label>
          <view class="chip-wrap">
            <button
              v-for="channel in channels"
              :key="channel"
              class="chip"
              :class="{ active: selectedChannel === channel }"
              @click="selectedChannel = channel"
            >
              <wd-icon v-if="channel === channels[3]" name="add" size="26rpx" />
              {{ channel }}
            </button>
          </view>
        </view>

        <view class="field row">
          <label>存放位置</label>
          <input v-model="location" placeholder="如：客厅储物柜" />
        </view>

        <view class="field switch-row last">
          <view>
            <label>已开封</label>
            <text>标记为正在使用的商品</text>
          </view>
          <switch color="#18B981" :checked="opened" @change="onOpenedChange" />
        </view>
      </view>
    </scroll-view>

    <view class="bottom-actions safe-area-bottom">
      <button class="secondary" :disabled="isSaving" @click="save(true)">保存并继续添加</button>
      <button class="primary" :disabled="isSaving" @click="save(false)">保存</button>
    </view>

    <AppTabBar active="add" />
  </view>
</template>

<style lang="scss" scoped>
.add-page {
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

.icon-button,
.save-link {
  min-width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
}

.icon-button {
  justify-content: flex-start;
  color: $color-text-primary;
}

.save-link {
  justify-content: flex-end;
  color: $color-primary-light;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.topbar-title {
  font-size: 36rpx;
  font-weight: $font-weight-bold;
  line-height: 48rpx;
  color: $color-text-primary;
}

.content {
  box-sizing: border-box;
  height: calc(100vh - 96rpx);
  padding: 40rpx 32rpx 296rpx;
}

.upload-wrap {
  position: relative;
  width: 320rpx;
  height: 320rpx;
  margin: 0 auto 40rpx;
}

.upload-card {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  border: 4rpx dashed $color-border-light;
  border-radius: 16rpx;
  overflow: hidden;
  background: #ffffff;
  color: $color-text-secondary;
  font-size: 26rpx;
}

.upload-card.has-image {
  gap: 0;
  border-style: solid;
  border-color: rgba(24, 185, 129, 0.22);
}

.upload-preview {
  width: 100%;
  height: 100%;
}

.upload-overlay {
  position: absolute;
  inset: auto 0 0;
  min-height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  background: linear-gradient(180deg, rgba(10, 31, 33, 0) 0%, rgba(10, 31, 33, 0.72) 100%);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.remove-image {
  position: absolute;
  top: -18rpx;
  right: -18rpx;
  z-index: 2;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  background: #ffffff;
  color: $color-text-secondary;
  box-shadow: $shadow-md;
}

.form-card {
  margin-bottom: 40rpx;
  padding: 32rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(21, 61, 53, 0.02);
}

.card-title {
  margin-bottom: 22rpx;
  font-size: 36rpx;
  font-weight: $font-weight-bold;
  line-height: 52rpx;
  color: $color-text-primary;
}

.field {
  min-height: 112rpx;
  border-bottom: 2rpx solid $color-border;
}

.field.last {
  border-bottom: 0;
}

.field label {
  font-size: 30rpx;
  line-height: 42rpx;
  color: $color-text-primary;
}

.field label text {
  margin-left: 6rpx;
  color: $color-danger;
}

.field input {
  min-width: 0;
  flex: 1;
  height: 72rpx;
  font-size: 30rpx;
  color: $color-text-primary;
  text-align: right;
}

.field.column {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 16rpx 0;
}

.field.column input {
  width: 100%;
  height: 62rpx;
  margin-top: 6rpx;
  text-align: left;
}

.field.row,
.stepper-row,
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
}

.field.row label {
  flex: 0 0 160rpx;
}

.chip-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
}

.chip {
  min-height: 68rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 0 30rpx;
  border: 2rpx solid $color-border;
  border-radius: $radius-full;
  background: #ffffff;
  color: $color-text-secondary;
  font-size: 26rpx;
}

.chip.active {
  border-color: $color-primary-light;
  background: $color-primary-bg;
  color: $color-primary-light;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.stepper button {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  background: #d0e7e9;
  color: $color-text-secondary;
}

.stepper button.plus {
  background: $color-primary-bg;
  color: $color-primary-light;
}

.stepper > text {
  min-width: 54rpx;
  text-align: center;
  font-size: 36rpx;
  font-weight: $font-weight-bold;
  line-height: 48rpx;
}

.field-value,
.price-input {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10rpx;
  color: $color-text-secondary;
  font-size: 28rpx;
}

.field-picker {
  min-width: 0;
  flex: 1;
}

.field-picker .field-value {
  min-height: 72rpx;
}

.price-input input {
  width: 150rpx;
}

.switch-row > view {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.switch-row text {
  font-size: 24rpx;
  color: $color-text-secondary;
}

.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 128rpx;
  z-index: $z-fixed;
  display: flex;
  gap: 24rpx;
  padding: 24rpx 32rpx;
  border-top: 2rpx solid $color-border;
  background: #ffffff;
  box-shadow: 0 -8rpx 32rpx rgba(21, 61, 53, 0.06);
}

.bottom-actions button {
  height: 96rpx;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.bottom-actions .secondary {
  background: $color-primary-bg;
  color: $color-text-primary;
}

.bottom-actions .primary {
  background: $color-primary-light;
  color: #ffffff;
}
</style>
