<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { useRemindersStore } from "@/stores";
import { setGlobalApiErrorHandler, HttpStatusError } from "@/services/apiClient";

setGlobalApiErrorHandler((error: HttpStatusError) => {
  if (error.statusCode === 401 || error.statusCode === 403) {
    uni.showToast({ title: "登录已过期，请重新登录", icon: "none" });
    return;
  }
  if (error.statusCode >= 500) {
    uni.showToast({ title: "服务器繁忙，已切换至本地模式", icon: "none" });
  }
});

onLaunch(() => {
  console.log("[App] launch");
  void useRemindersStore().refresh();
});

onShow(() => {
  console.log("[App] show");
  void useRemindersStore().refresh();
});

onHide(() => {
  console.log("[App] hide");
});
</script>

<style lang="scss">
@use "@/styles/global.scss" as *;
</style>
