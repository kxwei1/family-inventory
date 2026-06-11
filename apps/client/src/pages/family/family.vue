<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import type { FamilyMemberSummary, FamilyOverview } from "@family-inventory/shared-types";
import { useFamilyStore } from "@/stores";

const familyStore = useFamilyStore();
const { family } = storeToRefs(familyStore);
const isInviteSheetVisible = ref(false);
const isRenameSheetVisible = ref(false);
const isAddressSheetVisible = ref(false);
const isMemberSheetVisible = ref(false);
const isPermissionsSheetVisible = ref(false);
const isSavingName = ref(false);
const isSavingAddress = ref(false);
const isSavingMember = ref(false);
const isDissolving = ref(false);
const familyNameDraft = ref("");
const addressContactDraft = ref("");
const addressPhoneDraft = ref("");
const addressRegionDraft = ref("");
const addressDetailDraft = ref("");
const addressNotesDraft = ref("");
const selectedMember = ref<FamilyMemberSummary | null>(null);
const inviteCode = computed(() => `FI-${family.value.id.replace(/[^a-z0-9]/gi, "").slice(-6).toUpperCase()}`);
const displayedMemberCount = computed(() => family.value.members.length);
const roleOptions: Array<{ id: FamilyMemberSummary["role"]; label: string }> = [
  { id: "admin", label: "管理员" },
  { id: "member", label: "成员" },
  { id: "guest", label: "访客" },
];
const roleDescriptions: Record<FamilyMemberSummary["role"], string> = {
  admin: "管理库存、成员与家庭资料",
  member: "新增、消耗与查看库存",
  guest: "查看共享库存与提醒",
};
const adminCount = computed(() => family.value.members.filter((member) => member.role === "admin").length);
const roleSummaries = computed(() =>
  roleOptions.map((role) => ({
    ...role,
    count: family.value.members.filter((member) => member.role === role.id).length,
    description: roleDescriptions[role.id],
  })),
);
const canRemoveSelectedMember = computed(() => {
  if (!selectedMember.value) return false;

  return selectedMember.value.role !== "admin" || adminCount.value > 1;
});

onShow(() => {
  void loadFamily();
});

async function loadFamily() {
  try {
    await familyStore.refresh();
  } catch {
    showToast("家庭信息加载失败");
  }
}

watch(
  () => family.value,
  (next) => syncSelectedMemberWith(next),
  { deep: true },
);

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: "/pages/profile/profile" }),
  });
}

function showToast(title: string) {
  uni.showToast({ title, icon: "none" });
}

function syncSelectedMemberWith(nextFamily: FamilyOverview) {
  if (!selectedMember.value) return;

  selectedMember.value =
    nextFamily.members.find((member) => member.id === selectedMember.value?.id) ?? null;

  if (!selectedMember.value) {
    isMemberSheetVisible.value = false;
  }
}

function canChangeSelectedMemberRole(role: FamilyMemberSummary["role"]) {
  if (!selectedMember.value) return false;

  return selectedMember.value.role !== "admin" || role === "admin" || adminCount.value > 1;
}

function openRenameSheet() {
  familyNameDraft.value = family.value.name;
  isRenameSheetVisible.value = true;
}

function closeRenameSheet() {
  if (isSavingName.value) return;
  isRenameSheetVisible.value = false;
}

async function saveFamilyName() {
  const name = familyNameDraft.value.trim();

  if (!name) {
    showToast("请输入家庭名称");
    return;
  }

  if (isSavingName.value) return;

  isSavingName.value = true;

  try {
    await familyStore.rename({ name });
    isRenameSheetVisible.value = false;
    uni.showToast({ title: "已更新家庭名称", icon: "success" });
  } catch {
    showToast("家庭名称保存失败");
  } finally {
    isSavingName.value = false;
  }
}

function openInviteSheet() {
  isInviteSheetVisible.value = true;
}

function closeInviteSheet() {
  isInviteSheetVisible.value = false;
}

function copyInviteCode() {
  uni.setClipboardData({
    data: inviteCode.value,
    success: () => uni.showToast({ title: "邀请码已复制", icon: "success" }),
    fail: () => showToast("复制失败"),
  });
}

function handleSetting(setting: FamilyOverview["settings"][number]) {
  switch (setting.id) {
    case "rename":
      openRenameSheet();
      return;
    case "address":
      openAddressSheet();
      return;
    case "permissions":
      openPermissionsSheet();
  }
}

function openAddressSheet() {
  addressContactDraft.value = family.value.address.contactName;
  addressPhoneDraft.value = family.value.address.phone;
  addressRegionDraft.value = family.value.address.region;
  addressDetailDraft.value = family.value.address.detail;
  addressNotesDraft.value = family.value.address.notes ?? "";
  isAddressSheetVisible.value = true;
}

function closeAddressSheet() {
  if (isSavingAddress.value) return;
  isAddressSheetVisible.value = false;
}

async function saveFamilyAddress() {
  const contactName = addressContactDraft.value.trim();
  const phone = addressPhoneDraft.value.trim();
  const region = addressRegionDraft.value.trim();
  const detail = addressDetailDraft.value.trim();
  const notes = addressNotesDraft.value.trim();

  if (!contactName || !phone || !region || !detail) {
    showToast("请补全联系人、电话和地址");
    return;
  }

  if (isSavingAddress.value) return;
  isSavingAddress.value = true;

  try {
    await familyStore.updateAddress({
      contactName,
      phone,
      region,
      detail,
      notes: notes || undefined,
    });
    isAddressSheetVisible.value = false;
    uni.showToast({ title: "家庭地址已保存", icon: "success" });
  } catch {
    showToast("家庭地址保存失败");
  } finally {
    isSavingAddress.value = false;
  }
}

function openMemberSheet(member: FamilyMemberSummary) {
  selectedMember.value = member;
  isMemberSheetVisible.value = true;
}

function openPermissionsSheet() {
  isPermissionsSheetVisible.value = true;
}

function closePermissionsSheet() {
  if (isDissolving.value) return;
  isPermissionsSheetVisible.value = false;
}

function openInviteFromPermissions() {
  isPermissionsSheetVisible.value = false;
  openInviteSheet();
}

function openMemberFromPermissions(member: FamilyMemberSummary) {
  isPermissionsSheetVisible.value = false;
  openMemberSheet(member);
}

function closeMemberSheet() {
  if (isSavingMember.value) return;
  isMemberSheetVisible.value = false;
}

async function changeMemberRole(role: FamilyMemberSummary["role"]) {
  if (!selectedMember.value || isSavingMember.value || selectedMember.value.role === role) return;

  if (!canChangeSelectedMemberRole(role)) {
    showToast("至少需要保留一名管理员");
    return;
  }

  isSavingMember.value = true;

  try {
    await familyStore.updateMemberRole({
      memberId: selectedMember.value.id,
      role,
    });
    uni.showToast({ title: "成员权限已更新", icon: "success" });
  } catch {
    showToast("成员权限更新失败");
  } finally {
    isSavingMember.value = false;
  }
}

function confirmRemoveMember() {
  if (!selectedMember.value || !canRemoveSelectedMember.value) {
    showToast("至少需要保留一名管理员");
    return;
  }

  uni.showModal({
    title: "移除成员",
    content: `确认移除 ${selectedMember.value.name} 的家庭访问权限？`,
    confirmText: "移除",
    confirmColor: "#dc2626",
    success: (result) => {
      if (result.confirm) {
        void removeSelectedMember();
      }
    },
  });
}

async function removeSelectedMember() {
  if (!selectedMember.value || isSavingMember.value) return;

  isSavingMember.value = true;

  try {
    await familyStore.removeMember({ memberId: selectedMember.value.id });
    isMemberSheetVisible.value = false;
    selectedMember.value = null;
    uni.showToast({ title: "已移除成员", icon: "success" });
  } catch {
    showToast("成员移除失败");
  } finally {
    isSavingMember.value = false;
  }
}

function confirmDissolve() {
  if (isDissolving.value) return;

  uni.showModal({
    title: "解散当前家庭",
    content: "解散后将仅保留你的个人家庭，库存、宠物档案与地址资料会继续保留。",
    confirmText: "确认解散",
    confirmColor: "#dc2626",
    success: (result) => {
      if (result.confirm) {
        void dissolveCurrentFamily();
      }
    },
  });
}

async function dissolveCurrentFamily() {
  if (isDissolving.value) return;

  isDissolving.value = true;

  try {
    await familyStore.dissolve();
    isPermissionsSheetVisible.value = false;
    isMemberSheetVisible.value = false;
    selectedMember.value = null;
    uni.showToast({ title: "家庭已解散", icon: "success" });
  } catch {
    showToast("家庭解散失败");
  } finally {
    isDissolving.value = false;
  }
}
</script>

<template>
  <view class="family-page">
    <view class="topbar">
      <button class="icon-button" @click="goBack">
        <wd-icon name="arrow-left" size="44rpx" />
      </button>
      <text class="topbar-title">家庭管理</text>
      <button class="icon-button right" @click="openPermissionsSheet">
        <wd-icon name="setting" size="44rpx" />
      </button>
    </view>

    <scroll-view class="content" scroll-y :show-scrollbar="false">
      <view class="family-card">
        <view>
          <view class="family-name">{{ family.name }}</view>
          <view class="created-at">创建于 {{ family.createdAt }}</view>
        </view>
        <view class="member-count">
          <wd-icon name="usergroup" size="30rpx" />
          <text>{{ displayedMemberCount }} 成员</text>
        </view>
      </view>

      <button class="invite-card" @click="openInviteSheet">
        <wd-icon name="user-add" size="64rpx" />
        <text>邀请新成员</text>
      </button>

      <view class="section-label">家庭成员</view>
      <view class="member-card">
        <view
          v-for="(member, index) in family.members"
          :key="member.id"
          class="member-row"
          :class="{ divided: index > 0 }"
          @click="openMemberSheet(member)"
        >
          <image
            v-if="member.avatar"
            class="member-avatar"
            :src="member.avatar"
            mode="aspectFill"
          />
          <view v-else class="member-avatar placeholder">
            <wd-icon name="user" size="40rpx" />
          </view>

          <view class="member-main">
            <view class="member-name">{{ member.name }}</view>
            <view class="member-subtitle">{{ member.subtitle }}</view>
          </view>

          <view class="role-pill" :class="member.role">
            <wd-icon v-if="member.role === 'admin'" name="star" size="26rpx" />
            <text>{{ member.roleText }}</text>
          </view>
        </view>
      </view>

      <view class="section-label">家庭设置</view>
      <view class="setting-card">
        <view
          v-for="(setting, index) in family.settings"
          :key="setting.id"
          class="setting-row"
          :class="{ divided: index > 0 }"
          @click="handleSetting(setting)"
        >
          <text>{{ setting.label }}</text>
          <wd-icon name="arrow-right" size="32rpx" />
        </view>
      </view>

      <button class="dissolve-button" :disabled="isDissolving" @click="confirmDissolve">
        {{ isDissolving ? "解散中" : "解散当前家庭" }}
      </button>
    </scroll-view>

    <view v-if="isRenameSheetVisible" class="sheet-mask" @click="closeRenameSheet">
      <view class="family-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-title">修改家庭名称</view>
        <input
          v-model="familyNameDraft"
          class="name-input"
          maxlength="16"
          placeholder="请输入家庭名称"
        />
        <view class="sheet-actions">
          <button class="secondary" @click="closeRenameSheet">取消</button>
          <button class="primary" :disabled="isSavingName" @click="saveFamilyName">
            {{ isSavingName ? "保存中" : "保存" }}
          </button>
        </view>
      </view>
    </view>

    <view v-if="isAddressSheetVisible" class="sheet-mask" @click="closeAddressSheet">
      <view class="family-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-title">家庭地址管理</view>
        <view class="address-form">
          <view class="address-field">
            <text>联系人</text>
            <input v-model="addressContactDraft" maxlength="16" placeholder="请输入联系人" />
          </view>
          <view class="address-field">
            <text>电话</text>
            <input v-model="addressPhoneDraft" maxlength="20" placeholder="请输入联系电话" />
          </view>
          <view class="address-field full">
            <text>地区</text>
            <input v-model="addressRegionDraft" maxlength="24" placeholder="如 上海市 浦东新区" />
          </view>
          <view class="address-field full">
            <text>详细地址</text>
            <input v-model="addressDetailDraft" maxlength="48" placeholder="街道、门牌号" />
          </view>
          <view class="address-field full">
            <text>备注</text>
            <input v-model="addressNotesDraft" maxlength="40" placeholder="选填，如 放门口置物架" />
          </view>
        </view>
        <view class="sheet-actions">
          <button class="secondary" @click="closeAddressSheet">取消</button>
          <button class="primary" :disabled="isSavingAddress" @click="saveFamilyAddress">
            {{ isSavingAddress ? "保存中" : "保存地址" }}
          </button>
        </view>
      </view>
    </view>

    <view v-if="isInviteSheetVisible" class="sheet-mask" @click="closeInviteSheet">
      <view class="family-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-title">邀请新成员</view>
        <view class="invite-code-card">
          <text class="invite-code">{{ inviteCode }}</text>
          <text class="invite-tip">复制邀请码给家人，对方加入后可共同管理库存。</text>
        </view>
        <button class="copy-invite" @click="copyInviteCode">复制邀请码</button>
      </view>
    </view>

    <view v-if="isPermissionsSheetVisible" class="sheet-mask" @click="closePermissionsSheet">
      <view class="family-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-title">权限与分享设置</view>

        <view class="permission-grid">
          <view v-for="role in roleSummaries" :key="role.id" class="permission-card">
            <view class="permission-count">{{ role.count }}</view>
            <view class="permission-label">{{ role.label }}</view>
            <view class="permission-desc">{{ role.description }}</view>
          </view>
        </view>

        <view class="share-row">
          <view>
            <text class="share-label">家庭邀请码</text>
            <text class="share-code">{{ inviteCode }}</text>
          </view>
          <button @click="copyInviteCode">复制</button>
        </view>

        <view class="permission-actions">
          <button class="secondary" @click="openInviteFromPermissions">邀请新成员</button>
          <button class="primary" :disabled="isDissolving" @click="confirmDissolve">
            {{ isDissolving ? "解散中" : "解散家庭" }}
          </button>
        </view>

        <view class="permission-member-list">
          <button
            v-for="member in family.members"
            :key="member.id"
            class="permission-member"
            @click="openMemberFromPermissions(member)"
          >
            <text>{{ member.name }}</text>
            <view :class="['role-pill', member.role]">
              <wd-icon v-if="member.role === 'admin'" name="star" size="26rpx" />
              <text>{{ member.roleText }}</text>
            </view>
          </button>
        </view>
      </view>
    </view>

    <view v-if="isMemberSheetVisible && selectedMember" class="sheet-mask" @click="closeMemberSheet">
      <view class="family-sheet safe-area-bottom" @click.stop>
        <view class="sheet-handle" />
        <view class="sheet-title">成员权限</view>

        <view class="member-editor">
          <image
            v-if="selectedMember.avatar"
            class="member-avatar"
            :src="selectedMember.avatar"
            mode="aspectFill"
          />
          <view v-else class="member-avatar placeholder">
            <wd-icon name="user" size="40rpx" />
          </view>
          <view>
            <view class="member-name">{{ selectedMember.name }}</view>
            <view class="member-subtitle">{{ selectedMember.subtitle }}</view>
          </view>
        </view>

        <view class="role-options">
          <button
            v-for="role in roleOptions"
            :key="role.id"
            :class="{ active: selectedMember.role === role.id }"
            :disabled="isSavingMember || !canChangeSelectedMemberRole(role.id)"
            @click="changeMemberRole(role.id)"
          >
            {{ role.label }}
          </button>
        </view>

        <button
          class="remove-member"
          :disabled="!canRemoveSelectedMember || isSavingMember"
          @click="confirmRemoveMember"
        >
          移除成员
        </button>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.family-page {
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
  justify-content: flex-start;
  flex: 0 0 80rpx;
}

.icon-button.right {
  justify-content: flex-end;
  flex: 0 0 80rpx;
}

.topbar-title {
  flex: 1;
  min-width: 0;
  font-size: 46rpx;
  font-weight: $font-weight-bold;
  line-height: 58rpx;
  letter-spacing: 0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.content {
  box-sizing: border-box;
  height: calc(100vh - 96rpx);
  padding: 40rpx 32rpx 96rpx;
}

.family-card {
  min-height: 142rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-radius: 24rpx;
  background: linear-gradient(100deg, #ffffff 0%, #ffffff 58%, #e8f8f2 100%);
  box-shadow: $shadow-md;
}

.family-name {
  font-size: 36rpx;
  font-weight: $font-weight-bold;
  line-height: 46rpx;
  color: $color-text-primary;
}

.created-at {
  margin-top: 18rpx;
  font-size: 26rpx;
  line-height: 34rpx;
  color: $color-text-secondary;
}

.member-count {
  height: 54rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 0 24rpx;
  border-radius: $radius-full;
  background: $color-primary-bg;
  color: $color-primary-light;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.invite-card {
  height: 200rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
  margin-top: 40rpx;
  border: 4rpx dashed $color-border-light;
  border-radius: 24rpx;
  background: #ffffff;
  color: $color-primary-light;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  box-shadow: $shadow-sm;
}

.section-label {
  margin: 40rpx 8rpx 20rpx;
  font-size: 28rpx;
  font-weight: $font-weight-bold;
  line-height: 36rpx;
  color: $color-text-secondary;
}

.member-card,
.setting-card {
  border-radius: 24rpx;
  background: #ffffff;
  box-shadow: $shadow-md;
  overflow: hidden;
}

.member-row {
  min-height: 160rpx;
  display: flex;
  align-items: center;
  gap: 26rpx;
  padding: 24rpx 32rpx;
}

.member-row.divided,
.setting-row.divided {
  border-top: 2rpx solid $color-border;
}

.member-avatar {
  width: 96rpx;
  height: 96rpx;
  flex: 0 0 96rpx;
  border-radius: $radius-full;
  background: $color-primary-bg;
}

.member-avatar.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-text-secondary;
}

.member-main {
  min-width: 0;
  flex: 1;
}

.member-name {
  font-size: 30rpx;
  font-weight: $font-weight-bold;
  line-height: 40rpx;
  color: $color-text-primary;
}

.member-subtitle {
  margin-top: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 24rpx;
  line-height: 32rpx;
  color: $color-text-secondary;
}

.role-pill {
  min-width: 92rpx;
  height: 46rpx;
  gap: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 14rpx;
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: $font-weight-bold;
}

.role-pill.admin {
  background: $color-primary-bg;
  color: $color-primary-light;
}

.role-pill.member {
  background: #d9eff0;
  color: #31413b;
}

.role-pill.guest {
  background: $color-accent-bg;
  color: $color-accent;
}

.setting-row {
  min-height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  color: $color-text-secondary;
}

.setting-row text {
  font-size: 30rpx;
  font-weight: $font-weight-medium;
  color: $color-text-primary;
}

.dissolve-button {
  width: 100%;
  height: 90rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 112rpx;
  color: $color-danger;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
}

.dissolve-button[disabled] {
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

.family-sheet {
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

.sheet-title {
  font-size: 38rpx;
  font-weight: $font-weight-bold;
  line-height: 50rpx;
  color: $color-text-primary;
}

.name-input {
  height: 88rpx;
  margin-top: 28rpx;
  padding: 0 24rpx;
  border: 2rpx solid $color-border;
  border-radius: 16rpx;
  background: $color-bg-page;
  color: $color-text-primary;
  font-size: 30rpx;
}

.address-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
  margin-top: 28rpx;
}

.address-field {
  min-width: 0;
  padding: 18rpx 20rpx;
  border: 2rpx solid $color-border;
  border-radius: 16rpx;
  background: $color-bg-page;
}

.address-field.full {
  grid-column: 1 / -1;
}

.address-field text {
  display: block;
  font-size: 22rpx;
  line-height: 30rpx;
  color: $color-text-secondary;
}

.address-field input {
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

.sheet-actions button,
.copy-invite {
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

.sheet-actions .primary,
.copy-invite {
  flex: 1;
  background: $color-primary;
  color: #ffffff;
}

.sheet-actions .primary[disabled] {
  opacity: 0.62;
}

.invite-code-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18rpx;
  margin-top: 28rpx;
  padding: 34rpx;
  border: 2rpx dashed $color-border;
  border-radius: 18rpx;
  background: $color-bg-page;
}

.invite-code {
  font-size: 46rpx;
  font-weight: $font-weight-bold;
  letter-spacing: 0;
  color: $color-primary;
}

.invite-tip {
  text-align: center;
  font-size: 26rpx;
  line-height: 38rpx;
  color: $color-text-secondary;
}

.copy-invite {
  width: 100%;
  margin-top: 34rpx;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 28rpx;
}

.permission-card {
  min-width: 0;
  min-height: 162rpx;
  padding: 20rpx 16rpx;
  border: 2rpx solid $color-border;
  border-radius: 18rpx;
  background: $color-bg-page;
}

.permission-count {
  font-size: 40rpx;
  font-weight: $font-weight-bold;
  line-height: 48rpx;
  color: $color-primary;
}

.permission-label {
  margin-top: 8rpx;
  font-size: 26rpx;
  font-weight: $font-weight-bold;
  line-height: 34rpx;
  color: $color-text-primary;
}

.permission-desc {
  margin-top: 6rpx;
  font-size: 22rpx;
  line-height: 30rpx;
  color: $color-text-secondary;
}

.share-row {
  min-height: 104rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  margin-top: 24rpx;
  padding: 20rpx 24rpx;
  border: 2rpx dashed $color-border;
  border-radius: 18rpx;
  background: $color-bg-page;
}

.share-row > view {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.share-label {
  font-size: 22rpx;
  color: $color-text-secondary;
}

.share-code {
  font-size: 34rpx;
  font-weight: $font-weight-bold;
  letter-spacing: 0;
  color: $color-primary;
}

.share-row button {
  width: 116rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14rpx;
  background: $color-primary;
  color: #ffffff;
  font-size: 26rpx;
  font-weight: $font-weight-bold;
}

.permission-actions {
  display: flex;
  gap: 18rpx;
  margin-top: 24rpx;
}

.permission-actions button {
  height: 82rpx;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: $font-weight-bold;
}

.permission-actions .secondary {
  border: 2rpx solid $color-border;
  color: $color-text-primary;
}

.permission-actions .primary {
  background: $color-danger;
  color: #ffffff;
}

.permission-actions .primary[disabled] {
  opacity: 0.56;
}

.permission-member-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 24rpx;
}

.permission-member {
  min-height: 78rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 0 18rpx;
  border-radius: 16rpx;
  background: $color-bg-page;
}

.permission-member > text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 28rpx;
  font-weight: $font-weight-bold;
  color: $color-text-primary;
}

.member-editor {
  display: flex;
  align-items: center;
  gap: 22rpx;
  margin-top: 28rpx;
  padding: 24rpx;
  border: 2rpx solid $color-border;
  border-radius: 18rpx;
  background: $color-bg-page;
}

.role-options {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14rpx;
  margin-top: 28rpx;
}

.role-options button {
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid $color-border;
  border-radius: 14rpx;
  color: $color-text-secondary;
  font-size: 26rpx;
  font-weight: $font-weight-bold;
}

.role-options button.active {
  border-color: $color-primary;
  background: $color-primary-bg;
  color: $color-primary;
}

.remove-member {
  width: 100%;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 34rpx;
  border: 2rpx solid $color-danger;
  border-radius: 16rpx;
  color: $color-danger;
  font-size: 30rpx;
  font-weight: $font-weight-bold;
}

.remove-member[disabled] {
  opacity: 0.45;
}
</style>
