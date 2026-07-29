# 多端客户端打包说明

本仓库 `native/` 目录提供 **真正的安装包工程**（WebView / Electron 壳，连接公网服务）。

## 已可下载（服务器已生成）

放在 `static/downloads/`，页面：`/downloads`

| 平台 | 文件 | 说明 |
|------|------|------|
| Windows | `*-Windows-安装目录.zip` | 解压后运行 `智能财务系统.exe` |
| Windows | `*-Windows-x64.zip` | 同上（打包产物） |
| Linux | `*-Linux.AppImage` | `chmod +x` 后直接运行 |

## 需本机工具链编译

| 平台 | 工程 | 工具 |
|------|------|------|
| Android APK | `native/mobile/android` | Android Studio / SDK（本机内存不足时 Gradle 可能 OOM） |
| iOS | `npx cap add ios`（需 Mac） | Xcode + Apple 开发者账号 |
| macOS 签名包 | `native/electron` | 在 Mac 上执行 `npm run dist:mac` |
| 鸿蒙 NEXT `.hap` | `native/harmony` | DevEco Studio（见目录 README） |

## 改服务器地址

- Electron：环境变量 `APP_URL`
- Capacitor：`native/mobile/capacitor.config.json` → `server.url`
- 鸿蒙：`native/harmony/Index.ets` → `SERVER_URL`

## 重新打包

```bash
# 桌面
cd native/electron && npm install && npx electron-builder --win zip --linux AppImage --x64

# 安卓
export ANDROID_HOME=/path/to/sdk
cd native/mobile && npx cap sync android
cd android && ./gradlew assembleDebug
```
