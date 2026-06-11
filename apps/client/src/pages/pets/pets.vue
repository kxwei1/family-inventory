<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import type { CreatePetRequest, PetProfileSummary, UpdatePetRequest } from "@family-inventory/shared-types";
import { usePetsStore } from "@/stores";

const petsStore = usePetsStore();
const { pets, selectedPetId } = storeToRefs(petsStore);
const isPetSheetVisible = ref(false);
const isAlbumSheetVisible = ref(false);
const isSavingPet = ref(false);
const isSavingAlbum = ref(false);
const sheetMode = ref<"create" | "edit">("edit");
const petNameDraft = ref("");
const petSpeciesDraft = ref("");
const petBreedDraft = ref("");
const petAgeDraft = ref("");
const petWeightDraft = ref(0);
const petTagsDraft = ref("");
const petDietStapleDraft = ref("");
const petDietSnackDraft = ref("");

const selectedPet = computed(() =>
  pets.value.find((pet) => pet.id === selectedPetId.value) ?? pets.value[0],
);

const sheetTitle = computed(() => (sheetMode.value === "create" ? "添加新宠物" : "编辑档案"));
const foodEstimateLabel = computed(() => (selectedPet.value?.species === "猫" ? "猫粮可用" : "主粮可用"));
const litterEstimateLabel = computed(() => (selectedPet.value?.species === "猫" ? "猫砂可用" : "清洁用品可用"));

onShow(() => {
  void loadPets();
});

async function loadPets() {
  try {
    await petsStore.refresh();
  } catch {
    uni.showToast({ title: "宠物档案加载失败", icon: "none" });
  }
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: "/pages/profile/profile" }),
  });
}

function selectPet(id: string) {
  petsStore.selectPet(id);
}

function openCreateSheet() {
  sheetMode.value = "create";
  petNameDraft.value = "";
  petSpeciesDraft.value = "猫";
  petBreedDraft.value = "";
  petAgeDraft.value = "";
  petWeightDraft.value = 0;
  petTagsDraft.value = "";
  petDietStapleDraft.value = "";
  petDietSnackDraft.value = "";
  isPetSheetVisible.value = true;
}

function openEditSheet() {
  if (!selectedPet.value) return;

  sheetMode.value = "edit";
  petNameDraft.value = selectedPet.value.name;
  petSpeciesDraft.value = selectedPet.value.species;
  petBreedDraft.value = selectedPet.value.breed;
  petAgeDraft.value = selectedPet.value.ageText;
  petWeightDraft.value = selectedPet.value.weightKg;
  petTagsDraft.value = selectedPet.value.tags.join("、");
  petDietStapleDraft.value = selectedPet.value.diet.staple;
  petDietSnackDraft.value = selectedPet.value.diet.snack;
  isPetSheetVisible.value = true;
}

function closePetSheet() {
  if (isSavingPet.value) return;
  isPetSheetVisible.value = false;
}

function openAlbumSheet() {
  if (!selectedPet.value) return;
  isAlbumSheetVisible.value = true;
}

function closeAlbumSheet() {
  if (isSavingAlbum.value) return;
  isAlbumSheetVisible.value = false;
}

async function savePet() {
  const name = petNameDraft.value.trim();
  const species = petSpeciesDraft.value.trim();
  const breed = petBreedDraft.value.trim();
  const ageText = petAgeDraft.value.trim();
  const weightKg = Number(petWeightDraft.value);
  const tags = parseTags(petTagsDraft.value);

  if (!name || !species || !breed) {
    uni.showToast({ title: "请补全名称、类型和品种", icon: "none" });
    return;
  }

  if (!Number.isFinite(weightKg) || weightKg < 0) {
    uni.showToast({ title: "请输入有效体重", icon: "none" });
    return;
  }

  if (isSavingPet.value) return;
  isSavingPet.value = true;

  try {
    if (sheetMode.value === "create") {
      const payload: CreatePetRequest = {
        name,
        species,
        breed,
        ageText: ageText || "未填写",
        weightKg,
        tags,
        diet: buildDietPayload(),
      };
      await petsStore.create(payload);
    } else if (selectedPet.value) {
      const payload: UpdatePetRequest = {
        name,
        species,
        breed,
        ageText: ageText || "未填写",
        weightKg,
        tags,
        diet: buildDietPayload(),
      };
      await petsStore.update(selectedPet.value.id, payload);
    }

    isPetSheetVisible.value = false;
    uni.showToast({ title: sheetMode.value === "create" ? "宠物已添加" : "档案已更新", icon: "success" });
  } catch {
    uni.showToast({ title: "宠物档案保存失败", icon: "none" });
  } finally {
    isSavingPet.value = false;
  }
}

function buildDietPayload(): CreatePetRequest["diet"] {
  const staple = petDietStapleDraft.value.trim();
  const snack = petDietSnackDraft.value.trim();

  if (!staple && !snack) {
    return undefined;
  }

  return {
    staple: staple || undefined,
    snack: snack || undefined,
  };
}

function parseTags(value: string) {
  return [
    ...new Set(
      value
        .split(/[、,，\s]+/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, 5);
}

function petInitial(pet: PetProfileSummary) {
  return pet.name.slice(0, 1);
}

function petAvatarImage(pet: PetProfileSummary) {
  return pet.avatar || pet.albumPhotos[0] || "";
}

function petHeroImage(pet: PetProfileSummary) {
  return pet.albumPhotos[0] || pet.avatar || "";
}

function albumPreviewPhotos(pet: PetProfileSummary) {
  return pet.albumPhotos.length > 3
    ? pet.albumPhotos.slice(1, 4)
    : pet.albumPhotos.slice(0, 3);
}

function albumOverflowCount(pet: PetProfileSummary) {
  return Math.max(0, pet.albumCount - albumPreviewPhotos(pet).length);
}

function chooseAlbumPhoto() {
  if (!selectedPet.value || isSavingAlbum.value) return;

  if (typeof uni.chooseImage !== "function") {
    uni.showToast({ title: "当前环境不支持选择图片", icon: "none" });
    return;
  }

  uni.chooseImage({
    count: 9,
    sourceType: ["album", "camera"],
    success: (result) => {
      const paths = Array.isArray(result.tempFilePaths) ? result.tempFilePaths : [];
      const images = paths.filter((path): path is string => typeof path === "string" && Boolean(path));

      if (images.length === 1) {
        void saveAlbumPhoto(images[0]);
        return;
      }

      if (images.length > 1) {
        void saveAlbumPhotos(images);
      }
    },
    fail: () => {
      uni.showToast({ title: "图片选择失败", icon: "none" });
    },
  });
}

async function saveAlbumPhoto(image: string) {
  if (!selectedPet.value || isSavingAlbum.value) return;

  isSavingAlbum.value = true;

  try {
    await petsStore.addAlbumPhoto(selectedPet.value.id, { image });
    uni.showToast({ title: "照片已加入相册", icon: "success" });
  } catch {
    uni.showToast({ title: "照片添加失败", icon: "none" });
  } finally {
    isSavingAlbum.value = false;
  }
}

async function saveAlbumPhotos(images: string[]) {
  if (!selectedPet.value || isSavingAlbum.value) return;

  isSavingAlbum.value = true;

  try {
    const { addedImages } = await petsStore.addAlbumPhotos(selectedPet.value.id, { images });
    if (addedImages.length === 0) {
      uni.showToast({ title: "照片已存在，已自动去重", icon: "none" });
      return;
    }
    uni.showToast({ title: `已加入 ${addedImages.length} 张`, icon: "success" });
  } catch {
    uni.showToast({ title: "照片批量添加失败", icon: "none" });
  } finally {
    isSavingAlbum.value = false;
  }
}

function confirmRemoveAlbumPhoto(image: string) {
  if (!selectedPet.value || isSavingAlbum.value) return;

  const petId = selectedPet.value.id;
  uni.showModal({
    title: "删除照片",
    content: "确认从相册移除这张照片？",
    confirmText: "删除",
    confirmColor: "#dc2626",
    success: (result) => {
      if (result.confirm) {
        void removeAlbumPhoto(petId, image);
      }
    },
  });
}

async function removeAlbumPhoto(petId: string, image: string) {
  if (isSavingAlbum.value) return;

  isSavingAlbum.value = true;

  try {
    await petsStore.removeAlbumPhoto(petId, { image });
    uni.showToast({ title: "照片已移除", icon: "success" });
  } catch {
    uni.showToast({ title: "照片移除失败", icon: "none" });
  } finally {
    isSavingAlbum.value = false;
  }
}
</script>

<template>
  <view class="pets-page">
    <view class="topbar">
      <button class="icon-button" @click="goBack">
        <wd-icon name="arrow-left" size="42rpx" />
      </button>
      <text class="topbar-title">宠物档案</text>
      <button class="icon-button right" @click="openEditSheet">
        <wd-icon name="edit" size="40rpx" />
      </button>
    </view>

    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <scroll-view class="pet-switcher" scroll-x :show-scrollbar="false">
        <button
          v-for="pet in pets"
          :key="pet.id"
          class="pet-tab"
          :class="{ active: selectedPet?.id === pet.id }"
          @click="selectPet(pet.id)"
        >
          <view class="pet-avatar" :class="`tone-${pet.colorTone}`">
            <image v-if="petAvatarImage(pet)" :src="petAvatarImage(pet)" mode="aspectFill" />
            <text v-else>{{ petInitial(pet) }}</text>
          </view>
          <text>{{ pet.name }}</text>
        </button>

        <button class="pet-tab add" @click="openCreateSheet">
          <view class="pet-avatar add-avatar">
            <wd-icon name="add" size="38rpx" />
          </view>
          <text>添加</text>
        </button>
      </scroll-view>

      <view v-if="selectedPet" class="profile-grid">
        <view
          class="pet-hero"
          :class="[`tone-${selectedPet.colorTone}`, { 'has-image': petHeroImage(selectedPet) }]"
        >
          <image
            v-if="petHeroImage(selectedPet)"
            class="hero-image"
            :src="petHeroImage(selectedPet)"
            mode="aspectFill"
          />
          <view v-else class="hero-initial">{{ petInitial(selectedPet) }}</view>
          <view class="hero-overlay">
            <view class="hero-name">{{ selectedPet.name }}</view>
            <view class="breed-pill">{{ selectedPet.breed }}</view>
          </view>
        </view>

        <view class="stats-grid">
          <view class="mini-stat">
            <text>年龄</text>
            <view>{{ selectedPet.ageText }}</view>
          </view>
          <view class="mini-stat">
            <text>体重</text>
            <view>{{ selectedPet.weightKg }}kg</view>
          </view>
          <view class="tag-panel">
            <text>性格标签</text>
            <view class="tag-row">
              <text v-for="tag in selectedPet.tags" :key="tag">{{ tag }}</text>
            </view>
          </view>
        </view>

        <view class="module-card">
          <view class="module-head">
            <view>
              <wd-icon name="chart" size="32rpx" />
              <text>体重曲线</text>
            </view>
            <button class="module-chevron" @click="openEditSheet">
              <wd-icon name="arrow-right" size="30rpx" />
            </button>
          </view>
          <view class="weight-bars">
            <view
              v-for="(point, index) in selectedPet.weightTrend"
              :key="point.label"
              class="weight-column"
            >
              <view class="weight-bar" :style="{ height: `${point.value}%` }">
                <text
                  v-if="index === selectedPet.weightTrend.length - 1"
                  class="weight-value"
                >
                  {{ selectedPet.weightKg }}
                </text>
              </view>
            </view>
          </view>
        </view>

        <view class="module-card">
          <view class="module-head">
            <view>
              <wd-icon name="cart" size="32rpx" />
              <text>饮食偏好</text>
            </view>
            <button class="module-chevron" @click="openEditSheet">
              <wd-icon name="arrow-right" size="30rpx" />
            </button>
          </view>
          <view class="diet-row">
            <text>主粮</text>
            <text>{{ selectedPet.diet.staple }}</text>
          </view>
          <view class="diet-row">
            <text>最爱零食</text>
            <text>{{ selectedPet.diet.snack }}</text>
          </view>
        </view>

        <view class="estimate-card">
          <view class="module-head">
            <view>
              <wd-icon name="list" size="32rpx" />
              <text>消耗数据预估</text>
            </view>
          </view>
          <view class="estimate-grid">
            <view>
              <text class="estimate-value">
                {{ selectedPet.inventoryEstimate.foodDays }}
                <text>天</text>
              </text>
              <view>{{ foodEstimateLabel }}</view>
            </view>
            <view>
              <text class="estimate-value warning">
                {{ selectedPet.inventoryEstimate.litterDays }}
                <text>天</text>
              </text>
              <view>{{ litterEstimateLabel }}</view>
            </view>
          </view>
        </view>

        <view class="album-card">
          <view class="module-head">
            <view>
              <wd-icon name="picture" size="32rpx" />
              <text>成长相册</text>
            </view>
            <button class="album-count" @click="openAlbumSheet">查看全部</button>
          </view>
          <view class="album-grid">
            <button
              v-for="(photo, index) in albumPreviewPhotos(selectedPet)"
              :key="photo"
              class="album-photo-wrap"
              @click="openAlbumSheet"
            >
              <image class="album-photo" :src="photo" mode="aspectFill" />
              <view
                v-if="index === albumPreviewPhotos(selectedPet).length - 1 && albumOverflowCount(selectedPet)"
                class="album-more-overlay"
              >
                +{{ albumOverflowCount(selectedPet) }}
              </view>
            </button>
            <view v-if="!selectedPet.albumPhotos.length" class="album-tile" :class="`tone-${selectedPet.colorTone}`">
              {{ petInitial(selectedPet) }}
            </view>
            <button
              v-if="selectedPet.albumPhotos.length < 3"
              class="album-tile add-photo"
              :disabled="isSavingAlbum"
              @click="chooseAlbumPhoto"
            >
              <wd-icon name="add" size="38rpx" />
            </button>
          </view>
        </view>
      </view>

      <view v-else class="empty-state">
        <wd-icon name="user-add" size="70rpx" />
        <text>还没有宠物档案</text>
        <button @click="openCreateSheet">添加新宠物</button>
      </view>
    </scroll-view>

    <view class="bottom-actions safe-area-bottom">
      <button class="secondary" @click="openCreateSheet">添加新宠物</button>
      <button class="primary" :disabled="!selectedPet" @click="openEditSheet">编辑档案</button>
    </view>

    <view v-if="isPetSheetVisible" class="sheet-mask" @click="closePetSheet">
      <view class="pet-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-head">
          <text>{{ sheetTitle }}</text>
          <button @click="closePetSheet">
            <wd-icon name="close" size="40rpx" />
          </button>
        </view>

        <view class="pet-form">
          <view class="form-field full">
            <text>宠物名称</text>
            <input v-model="petNameDraft" maxlength="16" placeholder="请输入宠物名称" />
          </view>
          <view class="form-field">
            <text>类型</text>
            <input v-model="petSpeciesDraft" maxlength="8" placeholder="猫 / 狗" />
          </view>
          <view class="form-field">
            <text>品种</text>
            <input v-model="petBreedDraft" maxlength="16" placeholder="如 中华田园猫" />
          </view>
          <view class="form-field">
            <text>年龄</text>
            <input v-model="petAgeDraft" maxlength="10" placeholder="如 3岁" />
          </view>
          <view class="form-field">
            <text>体重 kg</text>
            <input v-model.number="petWeightDraft" type="number" />
          </view>
          <view class="form-field full">
            <text>标签</text>
            <input v-model="petTagsDraft" maxlength="30" placeholder="用顿号或逗号分隔" />
          </view>
          <view class="form-field full">
            <text>主粮偏好</text>
            <input v-model="petDietStapleDraft" maxlength="24" placeholder="如：皇家室内成猫粮" />
          </view>
          <view class="form-field full">
            <text>最爱零食</text>
            <input v-model="petDietSnackDraft" maxlength="24" placeholder="如：冻干鹌鹑" />
          </view>
        </view>

        <button class="save-pet" :disabled="isSavingPet" @click="savePet">
          {{ isSavingPet ? "保存中" : "保存档案" }}
        </button>
      </view>
    </view>

    <view v-if="isAlbumSheetVisible && selectedPet" class="sheet-mask" @click="closeAlbumSheet">
      <view class="pet-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-head">
          <text>成长相册</text>
          <button @click="closeAlbumSheet">
            <wd-icon name="close" size="40rpx" />
          </button>
        </view>

        <view class="album-sheet-grid">
          <view
            v-for="photo in selectedPet.albumPhotos"
            :key="photo"
            class="album-sheet-photo-wrap"
          >
            <image
              class="album-sheet-photo"
              :src="photo"
              mode="aspectFill"
            />
            <button
              class="album-sheet-remove"
              :disabled="isSavingAlbum"
              @click.stop="confirmRemoveAlbumPhoto(photo)"
            >
              <wd-icon name="close" size="24rpx" />
            </button>
          </view>
          <button class="album-sheet-add" :disabled="isSavingAlbum" @click="chooseAlbumPhoto">
            <wd-icon name="add" size="44rpx" />
            <text>{{ isSavingAlbum ? "添加中" : "添加照片" }}</text>
          </button>
        </view>
        <text class="album-sheet-hint">长按可单张管理 · 一次最多添加 9 张</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.pets-page {
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
  box-sizing: border-box;
  background: $color-bg-page;
  color: $color-primary;
}

.icon-button {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 80rpx;
}

.topbar-title {
  flex: 1;
  min-width: 0;
  font-size: 46rpx;
  font-weight: $font-weight-bold;
  line-height: 58rpx;
  color: $color-primary;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content {
  box-sizing: border-box;
  height: calc(100vh - 96rpx);
  padding: 32rpx 32rpx calc(160rpx + env(safe-area-inset-bottom));
}

.pet-switcher {
  margin: 0 -32rpx;
  padding: 0 32rpx 16rpx;
  white-space: nowrap;
}

.pet-tab {
  width: 144rpx;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  margin-right: 32rpx;
  color: $color-text-secondary;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.pet-tab.active {
  color: $color-primary;
}

.pet-avatar {
  width: 128rpx;
  height: 128rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid transparent;
  border-radius: $radius-full;
  overflow: hidden;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
}

.pet-avatar image {
  width: 100%;
  height: 100%;
}

.pet-tab.active .pet-avatar {
  border-color: $color-primary;
  background-clip: padding-box;
}

.tone-orange {
  background: linear-gradient(135deg, #f59e0b, #ff7c5e);
}

.tone-white {
  background: linear-gradient(135deg, #d9eff0, #ffffff);
  color: $color-text-primary;
}

.tone-mint {
  background: linear-gradient(135deg, $color-primary-light, #71fbbd);
}

.tone-lake {
  background: linear-gradient(135deg, #448ffd, #abc7ff);
}

.tone-neutral {
  background: linear-gradient(135deg, #6b7280, #d1d5db);
}

.add-avatar {
  border: 4rpx dashed $color-border-light;
  background: #ffffff;
  color: $color-text-secondary;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24rpx;
  margin-top: 32rpx;
}

.pet-hero {
  grid-column: 1 / -1;
  position: relative;
  height: 384rpx;
  overflow: hidden;
  border-radius: 24rpx;
  box-shadow: $shadow-md;
}

.pet-hero.has-image {
  background: #ffffff;
}

.hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.hero-initial {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.9);
  font-size: 150rpx;
  font-weight: $font-weight-bold;
}

.hero-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 72rpx 28rpx 28rpx;
  background: linear-gradient(180deg, rgba(10, 31, 33, 0) 0%, rgba(10, 31, 33, 0.54) 100%);
}

.hero-name {
  font-size: 46rpx;
  font-weight: $font-weight-bold;
  color: #ffffff;
}

.breed-pill {
  min-height: 46rpx;
  display: flex;
  align-items: center;
  padding: 0 18rpx;
  border-radius: $radius-full;
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.stats-grid {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24rpx;
}

.mini-stat,
.tag-panel,
.module-card,
.album-card {
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: $shadow-md;
}

.mini-stat {
  min-height: 180rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.mini-stat text,
.tag-panel > text {
  font-size: 24rpx;
  line-height: 32rpx;
  color: $color-text-secondary;
}

.mini-stat view {
  margin-top: 8rpx;
  font-size: 42rpx;
  font-weight: $font-weight-bold;
  color: $color-primary;
}

.tag-panel {
  grid-column: 1 / -1;
  min-height: 156rpx;
  padding: 28rpx;
  background: $color-primary-bg;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
  margin-top: 14rpx;
}

.tag-row text {
  min-height: 46rpx;
  display: flex;
  align-items: center;
  padding: 0 18rpx;
  border-radius: $radius-full;
  background: #ffffff;
  color: $color-text-primary;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.module-card,
.estimate-card,
.album-card {
  grid-column: 1 / -1;
  padding: 32rpx;
}

.estimate-card {
  border: 2rpx solid #d6ecef;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #eaf3ff 0%, #ffffff 100%);
  box-shadow: $shadow-md;
}

.module-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.module-head > view {
  display: flex;
  align-items: center;
  gap: 12rpx;
  color: $color-primary;
}

.module-head text {
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.module-chevron {
  flex: 0 0 auto;
  width: 54rpx;
  height: 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-text-secondary;
}

.album-count {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx !important;
  color: $color-text-secondary !important;
}

.weight-bars {
  height: 192rpx;
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  padding: 28rpx 16rpx 16rpx;
  border-radius: 16rpx;
  background: #e1f8fa;
}

.weight-column {
  height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 12rpx;
}

.weight-bar {
  position: relative;
  min-height: 28rpx;
  border-radius: 8rpx 8rpx 0 0;
  background: $color-primary-light;
}

.weight-column:nth-child(1) .weight-bar {
  opacity: 0.5;
}

.weight-column:nth-child(2) .weight-bar {
  opacity: 0.6;
}

.weight-column:nth-child(3) .weight-bar {
  opacity: 0.7;
}

.weight-column:nth-child(4) .weight-bar {
  opacity: 0.82;
}

.weight-column:last-child .weight-bar {
  background: $color-primary;
  opacity: 1;
}

.weight-value {
  position: absolute;
  top: -30rpx;
  right: -8rpx;
  min-width: 48rpx;
  height: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6rpx;
  background: #ffffff;
  color: $color-primary;
  font-size: 20rpx;
  font-weight: $font-weight-bold;
  box-shadow: $shadow-sm;
}

.diet-row {
  min-height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 2rpx solid $color-border;
  font-size: 26rpx;
  color: $color-text-secondary;
}

.diet-row text:last-child {
  max-width: 410rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: $color-text-primary;
  font-weight: $font-weight-medium;
}

.estimate-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18rpx;
}

.estimate-grid > view {
  min-height: 112rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.estimate-grid text {
  color: $color-primary;
}

.estimate-value {
  font-size: 48rpx;
  font-weight: $font-weight-bold;
  color: $color-primary;
}

.estimate-value text {
  margin-left: 6rpx;
  font-size: 24rpx;
  font-weight: $font-weight-regular;
  color: inherit;
}

.estimate-value.warning {
  color: $color-warning;
}

.estimate-grid view view {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: $color-text-secondary;
}

.album-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
}

.album-tile {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  color: #ffffff;
  font-size: 44rpx;
  font-weight: $font-weight-bold;
}

.album-photo-wrap,
.album-photo,
.album-sheet-photo {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 16rpx;
  background: $color-bg-page;
}

.album-photo-wrap {
  position: relative;
  display: block;
  overflow: hidden;
}

.album-photo {
  height: 100%;
}

.album-more-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 31, 33, 0.42);
  color: #ffffff;
  font-size: 28rpx;
  font-weight: $font-weight-bold;
}

.album-tile.muted {
  background: $color-bg-muted;
}

.album-tile.add-photo {
  border: 2rpx dashed $color-border;
  background: $color-bg-page;
  color: $color-primary;
}

.album-tile.add-photo[disabled] {
  opacity: 0.56;
}

.album-tile.more {
  border: 0;
  background: rgba(10, 31, 33, 0.5);
}

.album-sheet-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 28rpx;
  max-height: 560rpx;
  overflow-y: auto;
}

.album-sheet-add {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  border: 2rpx dashed $color-border;
  border-radius: 16rpx;
  background: $color-bg-page;
  color: $color-primary;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.album-sheet-add[disabled] {
  opacity: 0.56;
}

.album-sheet-photo-wrap {
  position: relative;
  aspect-ratio: 1;
  border-radius: 16rpx;
  overflow: hidden;
  background: $color-bg-page;
}

.album-sheet-photo-wrap .album-sheet-photo {
  width: 100%;
  height: 100%;
}

.album-sheet-remove {
  position: absolute;
  top: 6rpx;
  right: 6rpx;
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  background: rgba(10, 31, 33, 0.68);
  color: #ffffff;
}

.album-sheet-remove[disabled] {
  opacity: 0.56;
}

.album-sheet-hint {
  display: block;
  margin-top: 18rpx;
  text-align: center;
  color: $color-text-secondary;
  font-size: 22rpx;
}

.empty-state {
  min-height: 520rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24rpx;
  color: $color-text-secondary;
  font-size: 30rpx;
}

.empty-state button {
  height: 78rpx;
  padding: 0 34rpx;
  border-radius: 16rpx;
  background: $color-primary;
  color: #ffffff;
  font-weight: $font-weight-bold;
}

.bottom-actions {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: $z-fixed;
  display: flex;
  gap: 32rpx;
  padding: 24rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  border-top: 2rpx solid $color-border;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(16rpx);
}

.bottom-actions button {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  font-size: 34rpx;
  font-weight: $font-weight-bold;
}

.bottom-actions .secondary {
  flex: 1;
  background: $color-primary-bg;
  color: $color-primary;
}

.bottom-actions .primary {
  flex: 1;
  background: $color-primary;
  color: #ffffff;
}

.bottom-actions .primary[disabled] {
  opacity: 0.56;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: $z-modal-mask;
  display: flex;
  align-items: flex-end;
  background: rgba(10, 31, 33, 0.48);
}

.pet-sheet {
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

.pet-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
  margin-top: 28rpx;
}

.form-field {
  min-width: 0;
  padding: 20rpx 22rpx;
  border: 2rpx solid $color-border;
  border-radius: 16rpx;
  background: $color-bg-page;
}

.form-field.full {
  grid-column: 1 / -1;
}

.form-field text {
  display: block;
  font-size: 22rpx;
  line-height: 30rpx;
  color: $color-text-secondary;
}

.form-field input {
  height: 54rpx;
  margin-top: 8rpx;
  font-size: 28rpx;
  color: $color-text-primary;
}

.save-pet {
  width: 100%;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 34rpx;
  border-radius: 16rpx;
  background: $color-primary;
  color: #ffffff;
  font-size: 32rpx;
  font-weight: $font-weight-bold;
}

.save-pet[disabled] {
  opacity: 0.62;
}
</style>
