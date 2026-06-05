<template>
  <view class="paw-mark">
    <view class="paw-toe toe-1"></view>
    <view class="paw-toe toe-2"></view>
    <view class="paw-toe toe-3"></view>
    <view class="paw-toe toe-4"></view>
    <view class="paw-pad"></view>
  </view>
</template>

<style lang="scss" scoped>
.paw-mark {
  position: relative;
  width: 48rpx;
  height: 44rpx;
  color: inherit;
}

.paw-toe,
.paw-pad {
  position: absolute;
  display: block;
  background: currentColor;
}

.paw-toe {
  width: 13rpx;
  height: 16rpx;
  border-radius: $radius-full;
}

.toe-1 {
  top: 14rpx;
  left: 0;
  transform: rotate(-32deg);
}

.toe-2 {
  top: 0;
  left: 11rpx;
  transform: rotate(-10deg);
}

.toe-3 {
  top: 0;
  right: 11rpx;
  transform: rotate(10deg);
}

.toe-4 {
  top: 14rpx;
  right: 0;
  transform: rotate(32deg);
}

.paw-pad {
  left: 12rpx;
  bottom: 0;
  width: 24rpx;
  height: 22rpx;
  border-radius: 50% 50% 46% 46%;
  transform: rotate(45deg);
}
</style>
