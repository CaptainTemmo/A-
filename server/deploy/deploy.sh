#!/bin/bash

# ============================================
# A股选股推荐服务 - 国内轻量服务器一键部署脚本
# 使用方法: chmod +x deploy.sh && ./deploy.sh
# ============================================

set -e

INSTALL_DIR="/www/wwwroot/stock-selector"
LOG_DIR="$INSTALL_DIR/logs"
DATA_DIR="$INSTALL_DIR/data"

echo "============================================"
echo "   A股选股推荐服务 - 一键部署脚本"
echo "============================================"
echo ""

# 检查是否为 root
if [ "$EUID" -ne 0 ]; then
    echo "[错误] 请使用 root 权限执行此脚本 (sudo ./deploy.sh)"
    exit 1
fi

echo "[1/7] 检查并安装基础环境..."

# 检查并安装 Node.js
if ! command -v node &> /dev/null; then
    echo "  → 正在安装 Node.js 18 LTS..."
    curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
    yum install -y nodejs
else
    echo "  → Node.js 已安装: $(node --version)"
fi

# 检查并安装 npm/yarn
if ! command -v npm &> /dev/null; then
    echo "  → npm 未找到，尝试安装..."
    yum install -y npm
else
    echo "  → npm 已安装: $(npm --version)"
fi

# 安装 PM2（进程管理器）
if ! command -v pm2 &> /dev/null; then
    echo "  → 正在安装 PM2..."
    npm install -g pm2
    pm2 startup systemd | grep -v "To" | true
else
    echo "  → PM2 已安装: $(pm2 --version)"
fi

echo ""
echo "[2/7] 创建部署目录..."
mkdir -p "$INSTALL_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$DATA_DIR"
echo "  → 安装目录: $INSTALL_DIR"
echo "  → 日志目录: $LOG_DIR"
echo "  → 数据目录: $DATA_DIR"

echo ""
echo "[3/7] 复制项目文件到服务器..."

# 检查当前目录是否有 server 文件夹
if [ -d "./server" ]; then
    cp -r ./server/* "$INSTALL_DIR/"
    echo "  → 已从 ./server 复制文件"
elif [ -d "./src" ]; then
    cp -r ./* "$INSTALL_DIR/"
    echo "  → 已从当前目录复制文件"
elif [ -f "./ecosystem.config.js" ]; then
    cp -r ./* "$INSTALL_DIR/"
    echo "  → 已从当前目录复制文件"
else
    echo "[警告] 未检测到项目文件，请确保你在项目根目录执行此脚本"
    echo "  或手动将 server 目录下的所有文件复制到 $INSTALL_DIR"
fi

echo ""
echo "[4/7] 安装项目依赖..."
cd "$INSTALL_DIR"
npm install --production
echo "  → 依赖安装完成"

echo ""
echo "[5/7] 初始化数据库..."
node -e "
const db = require('./src/db/database');
console.log('数据库初始化完成');
" 2>&1 || echo "  → 数据库初始化警告（不影响运行）"

echo ""
echo "[6/7] 启动服务..."

# 先停止旧的进程（如果有）
pm2 stop stock-selector 2>/dev/null || true
pm2 delete stock-selector 2>/dev/null || true

# 启动新进程
pm2 start ecosystem.config.js --env production
pm2 save

echo "  → 服务已启动"
echo "  → PM2 进程列表:"
pm2 list

echo ""
echo "[7/7] 检查服务健康状态..."
sleep 3
if curl -s http://127.0.0.1:3000/api/recommendations/latest > /dev/null 2>&1; then
    echo "  → ✅ API 响应正常"
else
    echo "  → ⚠️  API 暂无数据（首次运行正常，定时任务会在收盘后生成推荐）"
fi

echo ""
echo "============================================"
echo "   部署完成！服务信息"
echo "============================================"
echo "API 地址: http://127.0.0.1:3000"
echo "进程管理: pm2 ls | pm2 logs stock-selector"
echo "重启服务: pm2 restart stock-selector"
echo "停止服务: pm2 stop stock-selector"
echo ""
echo "推荐数据路径: $INSTALL_DIR/data"
echo "日志文件路径: $LOG_DIR"
echo ""
echo "接下来需要配置 Nginx（见 server/deploy/nginx.conf）"
echo "如果已有宝塔面板，直接在『网站』→『反向代理』配置转发到 127.0.0.1:3000"
echo "============================================"
