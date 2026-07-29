# 鸿蒙 HarmonyOS NEXT 打包说明

1. 安装 [DevEco Studio](https://developer.huawei.com/consumer/cn/deveco-studio/)
2. 新建 Empty Ability 工程（API 12+）
3. 用本目录 `Index.ets` 替换首页，并在 `module.json5` 声明网络权限 `ohos.permission.INTERNET`
4. 将 `SERVER_URL` 改为当前公网地址
5. Build Hap(s)/APP(s) 得到安装包

HarmonyOS 4 兼容机可直接安装 Android APK。
