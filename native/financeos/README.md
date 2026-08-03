# FinanceOS — 财务操作系统（Linux 桌面）

基于 **Ubuntu 24.04 / Linux 内核** 的财务专用桌面：Windows 式开始菜单与任务栏，业务能力拆成独立软件窗口，本地 `financeosd` 提供 API。

## 架构

```
桌面壳 (Electron)  →  独立应用窗口 (?chrome=os)
         ↓
financeosd (Flask/gunicorn @ 127.0.0.1:5000)
         ↓
SQLite / 现有 modules
```

首期应用：凭证、应收、应付、发票、审计、消息、设置。桌面图标按当前登录用户的 `user_features` 过滤。

## 环境要求

- Ubuntu 24.04 LTS 桌面（或其他带图形会话的 Linux）
- Python 3.10+、pip
- Node.js 18+ / npm（安装 Electron 桌面壳）
- systemd --user（推荐）

本仓库在无桌面的服务器上可开发与联调 API；**图形会话需在带桌面的机器上安装**。

## 一键安装

```bash
cd /path/to/shenji
bash native/financeos/packaging/install-financeos.sh
```

安装内容：

| 路径 | 说明 |
|------|------|
| `~/.local/share/financeos/app` | 应用代码副本 |
| `~/.local/share/financeos/desktop-shell` | Electron 桌面壳 |
| `~/.local/bin/financeos-open` | 启动器 |
| `~/.config/systemd/user/financeosd.service` | 本地 API 服务 |
| `~/.local/share/applications/financeos*.desktop` | 独立应用入口 |
| `~/.local/share/xsessions/financeos.desktop` | 登录会话 |

## 使用

```bash
# 健康检查
curl -s http://127.0.0.1:5000/api/financeos/health

# 启动桌面壳
financeos-open desktop

# 单独打开应用
financeos-open vouchers
financeos-open audit
```

或注销后在显示管理器选择 **FinanceOS** 会话。

浏览器极简模式（无侧栏）：任意业务页加 `?chrome=os`，例如：

`http://127.0.0.1:5000/finance/vouchers?chrome=os`

## 权限与应用可见性

`GET /api/financeos/apps`（需登录 Cookie）返回当前用户可见应用。

| 应用 | 功能键 |
|------|--------|
| 凭证 | `vouchers` |
| 应收 | `receivables` |
| 应付 | `payables` |
| 发票 | `invoices` |
| 审计 | `dashboard` 或 `analysis` |
| 消息 | `chat` |
| 设置 | 登录即可 |

角色默认权限见 `modules/roles.py`。

## 开发调试（本机）

```bash
# 终端 1：API
cd /path/to/shenji
bash native/financeos/daemon/financeosd.sh
# 或: python3 app.py

# 终端 2：桌面壳
cd native/financeos/desktop-shell
npm install
FINANCEOS_URL=http://127.0.0.1:5000 npm start
```

## 目录说明

```
native/financeos/
  desktop-shell/   # Electron：桌面 / 开始菜单 / 任务栏
  daemon/          # financeosd 启动脚本与 unit 模板
  packaging/       # 安装脚本、.desktop、图标、financeos-open
  session/         # 显示管理器会话入口
  apps/            # 应用清单 manifest.json
  README.md
```

## 二期（未包含）

- live-build / Cubic 制作可安装 ISO
- 更多应用（对账、报销、Agent）
- 自动更新通道
