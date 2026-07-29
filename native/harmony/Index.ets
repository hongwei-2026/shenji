import { webview } from '@kit.ArkWeb';

/** 修改为当前公网地址 */
const SERVER_URL = 'https://u909320-gg7n-7e2d25d3.weste.seetacloud.com:8443/?source=harmony';

@Entry
@Component
struct Index {
  controller: webview.WebviewController = new webview.WebviewController();

  build() {
    Column() {
      Web({ src: SERVER_URL, controller: this.controller })
        .width('100%')
        .height('100%')
        .javaScriptAccess(true)
        .domStorageAccess(true)
        .onlineImageAccess(true)
    }
    .width('100%')
    .height('100%')
  }
}
