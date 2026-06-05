<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";

onLaunch(() => {
  console.log("[App] launch");
});

onShow(() => {
  console.log("[App] show");
});

onHide(() => {
  console.log("[App] hide");
});
</script>

<style lang="scss">
@use "@/styles/global.scss" as *;
</style>
