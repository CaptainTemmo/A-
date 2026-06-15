#!/bin/bash

# ============================================
# A股选股推荐服务 - 更新部署脚本
# 使用方法: chmod +x update.sh && ./update.sh
# ============================================

set -e

INSTALL_DIR="/www/wwwroot/stock-selector"

echo "============================================"
echo "   A股选股推荐服务 - 更新脚本"
echo "============================================"
echo ""

# 检查服务是否在运行
if ! pm2 list | grep -q "stock-selector"; then
    echo "[警告] 未检测到运行中的 stock-selector 服务"
fi

echo "[1/4] 拉取最新代码..."
cd "$INSTALL_DIR"

# 如果是 git 仓库，直接拉取
if [ -d ".git" ]; then
    git pull origin main
    echo "  → 代码已更新"
else
    # 否则要求用户手动上传
    echo "  → 非 Git 仓库，请手动上传最新文件到 $INSTALL_DIR"
    echo "  → 按回车继续（或 Ctrl+C 取消）"
    read
fi

echo ""
echo "[2/4] 更新项目依赖..."
npm install --production
echo "  → 依赖已更新"

echo ""
echo "[3/4] 重启服务..."
pm2 restart stock-selector
echo "  → 服务已重启"

echo ""
echo "[4/4] 检查健康状态..."
sleep 3
if curl -s http://127.0.0.1:3000/api/recommendations/latest > /dev/null 2>&1; then
    echo "  → ✅ API 响应正常"
    echo ""
    echo "最新推荐数据:"
    curl -s http://127.0.0.1:3000/api/recommendations/latest | head -c 500
    echo ""
else
    echo "  → ⚠️  API 尚未返回数据（定时任务会在收盘后生成）"
fi

echo ""
echo "============================================"
echo "   更新完成！"
echo "============================================"
echo "查看日志: pm2 logs stock-selector"
echo "重启服务: pm2 restart stock-selector"
echo "查看状态: pm2 ls"
echo "============================================"
