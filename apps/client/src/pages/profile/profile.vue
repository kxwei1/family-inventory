<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import AppTabBar from "@/components/AppTabBar.vue";
import { useProfileStore } from "@/stores";

type MenuTone = "mint" | "blue" | "neutral";
type ProfilePanelId = "settings" | "notifications" | "help" | "about";
type ProfileMenuItemId = "inventory" | "history" | ProfilePanelId;

const profileStore = useProfileStore();
const { profile, notificationSettings } = storeToRefs(profileStore);
const notificationsEnabled = computed(() => notificationSettings.value.stockWarningEnabled);
const expiryNotificationsEnabled = computed(() => notificationSettings.value.expiryReminderEnabled);
const activePanel = ref<ProfilePanelId | null>(null);
const isSavingNotifications = ref(false);
const isProfileSheetVisible = ref(false);
const isSavingProfile = ref(false);
const profileNameDraft = ref("");
const profileAvatarDraft = ref("");
const supportEmail = "support@family-inventory.local";

const stats = computed(() => [
  { id: "pets", label: "我的宠物", value: String(profile.value.stats.petCount) },
  { id: "bookkeeping", label: "记账天数", value: String(profile.value.stats.bookkeepingDays) },
  { id: "reminders", label: "提醒事项", value: String(profile.value.stats.reminderCount) },
]);

const groups: Array<{
  title: string;
  items: Array<{ id: ProfileMenuItemId; label: string; icon: string; tone: MenuTone }>;
}> = [
  {
    title: "我的数据",
    items: [
      { id: "inventory", label: "物品管理", icon: "goods", tone: "mint" },
      { id: "history", label: "使用记录", icon: "history", tone: "blue" },
    ],
  },
  {
    title: "设置",
    items: [
      { id: "settings", label: "通用设置", icon: "setting", tone: "neutral" },
      { id: "notifications", label: "通知设置", icon: "notification", tone: "neutral" },
    ],
  },
  {
    title: "其他",
    items: [
      { id: "help", label: "帮助与反馈", icon: "help", tone: "neutral" },
      { id: "about", label: "关于我们", icon: "info-circle", tone: "neutral" },
    ],
  },
];

const panelTitle = computed(() => {
  if (activePanel.value === "settings") return "通用设置";
  if (activePanel.value === "notifications") return "通知设置";
  if (activePanel.value === "help") return "帮助与反馈";
  if (activePanel.value === "about") return "关于我们";
  return "";
});

onShow(() => {
  void loadProfileData();
});

async function loadProfileData() {
  try {
    await profileStore.refresh();
  } catch {
    uni.showToast({ title: "个人信息加载失败", icon: "none" });
  }
}

function onMenuItem(id: ProfileMenuItemId) {
  if (id === "inventory") {
    uni.switchTab({ url: "/pages/inventory/inventory" });
    return;
  }

  if (id === "history") {
    uni.navigateTo({ url: "/pages/records/records" });
    return;
  }

  if (id === "settings" || id === "notifications" || id === "help" || id === "about") {
    activePanel.value = id;
  }
}

function onStat(id: string) {
  if (id === "pets") {
    uni.navigateTo({ url: "/pages/pets/pets" });
    return;
  }

  if (id === "reminders") {
    uni.navigateTo({ url: "/pages/reminders/reminders" });
    return;
  }

  if (id === "bookkeeping") {
    uni.navigateTo({ url: "/pages/records/records" });
  }
}

function logout() {
  uni.showModal({
    title: "退出登录",
    content: "退出后仍会保留本地离线数据，下次登录可继续同步。",
    confirmText: "退出",
    success: (result) => {
      if (result.confirm) {
        uni.showToast({ title: "已退出登录", icon: "success" });
      }
    },
  });
}

function goFamily() {
  uni.navigateTo({ url: "/pages/family/family" });
}

function closePanel() {
  activePanel.value = null;
}

function openProfileSheet() {
  profileNameDraft.value = profile.value.name;
  profileAvatarDraft.value = profile.value.avatar;
  isProfileSheetVisible.value = true;
}

function closeProfileSheet() {
  if (isSavingProfile.value) return;
  isProfileSheetVisible.value = false;
}

async function saveProfile() {
  const name = profileNameDraft.value.trim();
  const avatar = profileAvatarDraft.value.trim();

  if (!name) {
    uni.showToast({ title: "请输入昵称", icon: "none" });
    return;
  }

  if (isSavingProfile.value) return;

  isSavingProfile.value = true;

  try {
    await profileStore.updateProfile({
      name,
      avatar: avatar || profile.value.avatar,
    });
    isProfileSheetVisible.value = false;
    uni.showToast({ title: "资料已更新", icon: "success" });
  } catch {
    uni.showToast({ title: "资料保存失败", icon: "none" });
  } finally {
    isSavingProfile.value = false;
  }
}

async function toggleNotifications() {
  if (isSavingNotifications.value) return;

  await saveNotificationSettings({
    stockWarningEnabled: !notificationsEnabled.value,
  });
}

async function toggleExpiryNotifications() {
  if (isSavingNotifications.value) return;

  await saveNotificationSettings({
    expiryReminderEnabled: !expiryNotificationsEnabled.value,
  });
}

async function saveNotificationSettings(payload: {
  stockWarningEnabled?: boolean;
  expiryReminderEnabled?: boolean;
}) {
  isSavingNotifications.value = true;

  try {
    await profileStore.updateNotificationSettings(payload);
  } catch {
    uni.showToast({ title: "通知设置保存失败", icon: "none" });
  } finally {
    isSavingNotifications.value = false;
  }
}

function copySupportEmail() {
  uni.setClipboardData({
    data: supportEmail,
    success: () => uni.showToast({ title: "邮箱已复制", icon: "success" }),
    fail: () => uni.showToast({ title: "复制失败", icon: "none" }),
  });
}
</script>

<template>
  <view class="profile-page">
    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <view class="hero-card">
        <view class="avatar-wrap">
          <image class="avatar" :src="profile.avatar" mode="aspectFill" />
          <button class="edit-button" @click="openProfileSheet">
            <wd-icon name="edit" size="32rpx" />
          </button>
        </view>

        <view class="username">{{ profile.name }}</view>

        <button class="family-pill" @click="goFamily">
          <wd-icon name="home" size="28rpx" />
          <text>{{ profile.familyName }}</text>
          <wd-icon name="arrow-down" size="26rpx" />
        </button>
      </view>

      <view class="stats-grid">
        <button v-for="stat in stats" :key="stat.label" class="stat-card" @click="onStat(stat.id)">
          <view class="stat-value">{{ stat.value }}</view>
          <view class="stat-label">{{ stat.label }}</view>
        </button>
      </view>

      <view class="menu-groups">
        <view v-for="group in groups" :key="group.title" class="menu-card">
          <view class="menu-title">{{ group.title }}</view>

          <view
            v-for="(item, index) in group.items"
            :key="item.id"
            class="menu-item"
            :class="{ divided: index > 0 }"
            @click="onMenuItem(item.id)"
          >
            <view class="menu-icon" :class="`tone-${item.tone}`">
              <wd-icon :name="item.icon" size="34rpx" />
            </view>
            <text class="menu-label">{{ item.label }}</text>
            <wd-icon name="arrow-right" size="28rpx" />
          </view>
        </view>
      </view>

      <view class="logout-area">
        <button class="logout-button" @click="logout">退出登录</button>
        <text class="version">当前版本 v1.0.0</text>
      </view>
    </scroll-view>

    <AppTabBar active="profile" />

    <view v-if="isProfileSheetVisible" class="sheet-mask" @click="closeProfileSheet">
      <view class="profile-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-head">
          <text>编辑资料</text>
          <button @click="closeProfileSheet">
            <wd-icon name="close" size="40rpx" />
          </button>
        </view>

        <view class="profile-form">
          <view class="profile-field">
            <text>昵称</text>
            <input v-model="profileNameDraft" maxlength="16" placeholder="请输入昵称" />
          </view>
          <view class="profile-field">
            <text>头像地址</text>
            <input v-model="profileAvatarDraft" maxlength="120" placeholder="/static/family/zhangsan.png" />
          </view>
        </view>

        <view class="sheet-actions">
          <button class="secondary" @click="closeProfileSheet">取消</button>
          <button class="primary" :disabled="isSavingProfile" @click="saveProfile">
            {{ isSavingProfile ? "保存中..." : "保存资料" }}
          </button>
        </view>
      </view>
    </view>

    <view v-if="activePanel" class="sheet-mask" @click="closePanel">
      <view class="profile-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-head">
          <text>{{ panelTitle }}</text>
          <button @click="closePanel">
            <wd-icon name="close" size="40rpx" />
          </button>
        </view>

        <view v-if="activePanel === 'settings'" class="panel-list">
          <view class="panel-row">
            <view>
              <text class="row-title">数据同步</text>
              <text class="row-subtitle">本地优先，后端可用时自动同步</text>
            </view>
            <text class="status-pill">正常</text>
          </view>
          <button class="panel-row clickable" @click="goFamily">
            <view>
              <text class="row-title">当前家庭</text>
              <text class="row-subtitle">{{ profile.familyName }}</text>
            </view>
            <wd-icon name="arrow-right" size="30rpx" />
          </button>
          <view class="panel-row">
            <view>
              <text class="row-title">离线缓存</text>
              <text class="row-subtitle">库存、记录和提醒会保存在本机</text>
            </view>
            <text class="status-pill neutral">已启用</text>
          </view>
        </view>

        <view v-else-if="activePanel === 'notifications'" class="panel-list">
          <button class="panel-row clickable" :disabled="isSavingNotifications" @click="toggleNotifications">
            <view>
              <text class="row-title">库存预警</text>
              <text class="row-subtitle">低库存时在首页和提醒页展示</text>
            </view>
            <text class="switch-pill" :class="{ active: notificationsEnabled }">
              {{ notificationsEnabled ? "开" : "关" }}
            </text>
          </button>
          <button
            class="panel-row clickable"
            :disabled="isSavingNotifications"
            @click="toggleExpiryNotifications"
          >
            <view>
              <text class="row-title">临期提醒</text>
              <text class="row-subtitle">批次接近过期时提醒处理</text>
            </view>
            <text class="switch-pill" :class="{ active: expiryNotificationsEnabled }">
              {{ expiryNotificationsEnabled ? "开" : "关" }}
            </text>
          </button>
        </view>

        <view v-else-if="activePanel === 'help'" class="panel-list">
          <view class="help-block">
            <text class="row-title">常见问题</text>
            <text class="row-subtitle">扫码失败时可切换到“扫包装”或使用手动输入。</text>
            <text class="row-subtitle">补货完成后会自动写入库存历史。</text>
          </view>
          <button class="copy-support" @click="copySupportEmail">复制反馈邮箱</button>
        </view>

        <view v-else class="about-panel">
          <image src="/static/logo.png" mode="aspectFit" />
          <text class="about-title">家庭库存助手</text>
          <text class="row-subtitle">当前版本 v1.0.0</text>
          <text class="row-subtitle">为宠物家庭管理库存、补货、消耗与提醒。</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.profile-page {
  min-height: 100vh;
  background: $color-bg-page;
}

.content {
  box-sizing: border-box;
  height: 100vh;
  padding: 40rpx 32rpx 230rpx;
}

.hero-card {
  min-height: 440rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 32rpx 42rpx;
  border: 2rpx solid #ffffff;
  border-radius: 24rpx;
  background: linear-gradient(147deg, #e8f8f2 0%, #f8fbfa 100%);
  box-shadow: $shadow-md;
}

.avatar-wrap {
  position: relative;
  width: 192rpx;
  height: 192rpx;
}

.avatar {
  width: 192rpx;
  height: 192rpx;
  border: 8rpx solid #ffffff;
  border-radius: $radius-full;
  box-shadow: $shadow-sm;
}

.edit-button {
  position: absolute;
  right: 2rpx;
  bottom: 0;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  background: $color-primary;
  color: #ffffff;
  box-shadow: 0 8rpx 12rpx rgba(0, 0, 0, 0.1);
}

.username {
  margin-top: 26rpx;
  font-size: 48rpx;
  font-weight: $font-weight-bold;
  line-height: 60rpx;
  color: $color-text-primary;
}

.family-pill {
  min-height: 58rpx;
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-top: 18rpx;
  padding: 0 24rpx;
  border: 2rpx solid $color-border;
  border-radius: $radius-full;
  background: #ffffff;
  color: $color-text-primary;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
  box-shadow: 0 4rpx 12rpx rgba(21, 61, 53, 0.08);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24rpx;
  margin-top: 40rpx;
}

.stat-card {
  height: 176rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx solid $color-border;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: $shadow-sm;
}

.stat-value {
  font-size: 56rpx;
  font-weight: $font-weight-bold;
  line-height: 66rpx;
  color: $color-primary;
}

.stat-label {
  margin-top: 10rpx;
  font-size: 26rpx;
  line-height: 34rpx;
  color: $color-text-secondary;
}

.menu-groups {
  display: flex;
  flex-direction: column;
  gap: 40rpx;
  margin-top: 40rpx;
}

.menu-card {
  border: 2rpx solid $color-border;
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: $shadow-sm;
  overflow: hidden;
}

.menu-title {
  min-height: 100rpx;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
  border-bottom: 2rpx solid $color-border;
  background: rgba(248, 251, 250, 0.65);
  font-size: 34rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.menu-item {
  min-height: 112rpx;
  display: flex;
  align-items: center;
  padding: 0 32rpx;
  color: $color-text-secondary;
}

.menu-item.divided {
  border-top: 2rpx solid $color-border;
}

.menu-icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 64rpx;
  border-radius: $radius-full;
}

.tone-mint {
  background: $color-primary-bg;
  color: $color-primary;
}

.tone-blue {
  background: $color-accent-bg;
  color: $color-accent;
}

.tone-neutral {
  background: #f3f4f6;
  color: #31413b;
}

.menu-label {
  flex: 1;
  margin-left: 24rpx;
  font-size: 30rpx;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.logout-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 32rpx;
  padding: 64rpx 0 12rpx;
}

.logout-button {
  width: 100%;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid $color-danger;
  border-radius: 16rpx;
  background: #ffffff;
  color: $color-danger;
  font-size: 32rpx;
  font-weight: $font-weight-bold;
}

.version {
  font-size: 24rpx;
  line-height: 32rpx;
  color: $color-text-secondary;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  z-index: $z-modal-mask;
  display: flex;
  align-items: flex-end;
  background: rgba(10, 31, 33, 0.48);
}

.profile-sheet {
  width: 100%;
  max-height: 76vh;
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

.sheet-head text {
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

.profile-form {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 28rpx;
}

.profile-field {
  min-width: 0;
  padding: 18rpx 20rpx;
  border: 2rpx solid $color-border;
  border-radius: 16rpx;
  background: $color-bg-page;
}

.profile-field text {
  display: block;
  font-size: 22rpx;
  line-height: 30rpx;
  color: $color-text-secondary;
}

.profile-field input {
  height: 54rpx;
  margin-top: 8rpx;
  color: $color-text-primary;
  font-size: 28rpx;
}

.sheet-actions {
  display: flex;
  gap: 18rpx;
  margin-top: 34rpx;
}

.sheet-actions button {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
}

.sheet-actions .secondary {
  flex: 0 0 190rpx;
  border: 2rpx solid $color-border;
  color: $color-text-primary;
}

.sheet-actions .primary {
  flex: 1;
  background: $color-primary;
  color: #ffffff;
}

.sheet-actions .primary[disabled] {
  opacity: 0.62;
}

.panel-list {
  margin-top: 28rpx;
  border: 2rpx solid $color-border;
  border-radius: 18rpx;
  overflow: hidden;
}

.panel-row,
.help-block {
  min-height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24rpx;
  padding: 24rpx 28rpx;
  border-bottom: 2rpx solid $color-border;
}

.panel-row:last-child,
.help-block:last-child {
  border-bottom: 0;
}

.panel-row.clickable {
  width: 100%;
  color: $color-text-primary;
}

.row-title,
.row-subtitle {
  display: block;
}

.row-title {
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  line-height: 40rpx;
  color: $color-text-primary;
}

.row-subtitle {
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 34rpx;
  color: $color-text-secondary;
}

.status-pill,
.switch-pill {
  min-width: 82rpx;
  height: 46rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: $radius-full;
  background: $color-primary-bg;
  color: $color-primary;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.status-pill.neutral,
.switch-pill {
  background: #f3f4f6;
  color: $color-text-secondary;
}

.switch-pill.active {
  background: $color-primary;
  color: #ffffff;
}

.help-block {
  flex-direction: column;
  align-items: flex-start;
}

.copy-support {
  width: calc(100% - 56rpx);
  height: 82rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 24rpx 28rpx 28rpx;
  border-radius: 16rpx;
  background: $color-primary;
  color: #ffffff;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
}

.about-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  margin-top: 34rpx;
  padding: 34rpx;
  border: 2rpx solid $color-border;
  border-radius: 18rpx;
  background: $color-bg-page;
}

.about-panel image {
  width: 112rpx;
  height: 112rpx;
}

.about-title {
  font-size: 34rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}
</style>
