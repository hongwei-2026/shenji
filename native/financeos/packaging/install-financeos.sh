#!/usr/bin/env bash
# 在 Ubuntu 24.04 桌面机上将本仓库安装为 FinanceOS 会话
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PREFIX="${FINANCEOS_PREFIX:-$HOME/.local}"
SHARE="$PREFIX/share/financeos"
BIN="$PREFIX/bin"
APP_DIR="$SHARE/app"
SHELL_DIR="$SHARE/desktop-shell"
SESSION_DIR="$SHARE/session"
DESKTOP_DIR="$HOME/.local/share/applications"
ICON_DIR="$HOME/.local/share/icons/hicolor/scalable/apps"
XSESSIONS_USER="$HOME/.local/share/xsessions"
SYSTEMD_USER="$HOME/.config/systemd/user"

echo "==> FinanceOS 安装"
echo "    仓库: $REPO_ROOT"
echo "    前缀: $PREFIX"

mkdir -p "$BIN" "$APP_DIR" "$SHELL_DIR" "$SESSION_DIR" "$DESKTOP_DIR" "$ICON_DIR" "$XSESSIONS_USER" "$SYSTEMD_USER"

# 同步应用树（排除体积大的无关目录）
echo "==> 同步应用代码到 $APP_DIR"
rsync -a --delete \
  --exclude '.git' \
  --exclude 'native/dist' \
  --exclude 'native/electron/node_modules' \
  --exclude 'native/financeos/desktop-shell/node_modules' \
  --exclude 'native/mobile/node_modules' \
  --exclude 'native/mobile/android' \
  --exclude '__pycache__' \
  --exclude '*.pyc' \
  "$REPO_ROOT/" "$APP_DIR/"

# 桌面壳
echo "==> 安装桌面壳"
rsync -a --delete \
  --exclude 'node_modules' \
  --exclude 'dist' \
  "$REPO_ROOT/native/financeos/desktop-shell/" "$SHELL_DIR/"

if command -v npm >/dev/null 2>&1; then
  (cd "$SHELL_DIR" && npm install --omit=dev 2>/dev/null || npm install)
else
  echo "警告: 未找到 npm，稍后请在 $SHELL_DIR 手动 npm install"
fi

# 启动器
install -m 0755 "$REPO_ROOT/native/financeos/packaging/financeos-open" "$BIN/financeos-open"
# 会话脚本
install -m 0755 "$REPO_ROOT/native/financeos/session/start-financeos.sh" "$SESSION_DIR/start-financeos.sh"
install -m 0644 "$REPO_ROOT/native/financeos/session/financeos.desktop" "$XSESSIONS_USER/financeos.desktop"
# 修正会话 Exec 为实际路径
sed -i "s|Exec=.*|Exec=$SESSION_DIR/start-financeos.sh|" "$XSESSIONS_USER/financeos.desktop"

# 桌面入口
for f in "$REPO_ROOT"/native/financeos/packaging/desktop/*.desktop; do
  install -m 0644 "$f" "$DESKTOP_DIR/$(basename "$f")"
done

# 图标
for f in "$REPO_ROOT"/native/financeos/packaging/icons/*.svg; do
  install -m 0644 "$f" "$ICON_DIR/$(basename "$f")"
done
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f "$HOME/.local/share/icons/hicolor" 2>/dev/null || true
fi

# systemd user 服务
echo "==> 配置 financeosd 用户服务"
SERVICE_DST="$SYSTEMD_USER/financeosd.service"
cat > "$SERVICE_DST" <<EOF
[Unit]
Description=FinanceOS local API daemon
After=network.target

[Service]
Type=simple
WorkingDirectory=$APP_DIR
Environment=FINANCEOS_HOST=127.0.0.1
Environment=FINANCEOS_PORT=5000
Environment=FLASK_DEBUG=0
Environment=PATH=$BIN:/usr/local/bin:/usr/bin
ExecStart=$APP_DIR/native/financeos/daemon/financeosd.sh
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
EOF

chmod +x "$APP_DIR/native/financeos/daemon/financeosd.sh"

# Python 依赖（尽量不打断已有环境）
if command -v pip3 >/dev/null 2>&1; then
  echo "==> 安装 Python 依赖"
  pip3 install -r "$APP_DIR/requirements.txt" -q || pip3 install -r "$APP_DIR/requirements.txt"
fi

# PATH
if ! echo ":$PATH:" | grep -q ":$BIN:"; then
  SHELL_RC="$HOME/.bashrc"
  if [[ -n "${ZSH_VERSION:-}" ]]; then SHELL_RC="$HOME/.zshrc"; fi
  echo "export PATH=\"$BIN:\$PATH\"" >> "$SHELL_RC"
  echo "    已写入 PATH 到 $SHELL_RC （请重新打开终端）"
fi
export PATH="$BIN:$PATH"
export FINANCEOS_SHELL="$SHELL_DIR"

systemctl --user daemon-reload
systemctl --user enable --now financeosd.service || {
  echo "警告: 无法启用 systemd 用户服务，可手动运行:"
  echo "  $APP_DIR/native/financeos/daemon/financeosd.sh"
}

# 刷新桌面数据库
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$DESKTOP_DIR" 2>/dev/null || true
fi

echo
echo "==> 安装完成"
echo "    1. 确认服务: curl -s http://127.0.0.1:5000/api/financeos/health"
echo "    2. 启动桌面: financeos-open desktop"
echo "    3. 或在登录界面选择会话: FinanceOS"
echo "    应用列表由 /api/financeos/apps 按账号权限过滤"
echo
