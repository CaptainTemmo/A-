# A股智选 - 国内轻量服务器部署指南

## 目录

1. [服务器选购建议
2. [系统环境要求
3. [一键部署（推荐）
4. [Nginx / 宝塔面板配置
5. [前端 GitHub Pages 连接后端
6. [定时任务说明
7. [维护与升级
8. [常见问题排查

---

## 1. 服务器选购建议

| 云服务商 | 推荐配置 | 价格（约） | 说明 |
|---------|--------|----------|------|
| 阿里云 腾讯云 华为云 | 2核2G | ¥30-50/月 | 最低配置，可用 |
| 阿里云 腾讯云 华为云 | 2核4G | ¥60-100/月 | 推荐配置，稳 |

> ⚠️ **重要提示：新用户首次购买通常有大幅优惠（约 ¥99/年），建议选择 Linux 系统。

## 2. 系统环境要求

| 软件 | 版本 |
|-----|-----|
| 操作系统 | CentOS 7+ 或 Ubuntu 18+ |
| Node.js | 16 LTS 或 18 LTS |
| npm | 6+ |
| PM2 | 最新版 |
| Nginx | 1.18+ |

> 如使用宝塔面板，无需手动安装 Nginx，宝塔面板会自带。

## 3. 一键部署

### 方式一：使用部署脚本（推荐）

```bash
# 1. SSH 登录服务器
ssh root@你的服务器IP

# 2. 进入你想部署的目录
mkdir -p /www/wwwroot/stock-selector && cd /www/wwwroot/stock-selector

# 3. 从 GitHub 拉取代码
# 方式 A：直接从 GitHub 克隆
git clone https://github.com/CaptainTemmo/A-.git /www/wwwroot/stock-selector

# 4. 运行部署脚本
chmod +x /www/wwwroot/stock-selector/deploy/deploy.sh
cd /www/wwwroot/stock-selector/deploy
./deploy.sh
```

### 方式二：宝塔面板手动部署

如果你的服务器装了宝塔面板，安装步骤：

1. 宝塔面板 → 软件商店 → 安装「Nginx」、「PM2管理器」
2. 文件 → 上传 server 目录下所有文件（在/www/wwwroot/stock-selector）
3. 在/www/wwwroot/stock-selector 目录下右键：
```bash
npm install
```
4. PM2 管理器 → 添加项目：
   - 项目名称：stock-selector
   - 项目目录：/www/wwwroot/stock-selector
   - 启动文件：src/index.js
   - 项目类型：Node.js
   - 勾选「开机自启」
5. 网站 → 添加站点 → 域名填写你的服务器IP或域名
6. 网站设置 → 反向代理 → 添加反向代理：
   - 代理名称：stock-api
   - 目标 URL：http://127.0.0.1:3000
   - 发送域名：$host

### 方式三：纯手动部署

```bash
# 1. 安装 Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs -y

# 2. 安装 PM2
npm install -g pm2

# 3. 部署目录
mkdir -p /www/wwwroot/stock-selector
cd /www/wwwroot/stock-selector

# 4. 上传项目文件（从 GitHub 拉取或手动上传）
# git clone https://github.com/CaptainTemmo/A-.git .
# 或 scp -r ./server/* root@IP:/www/wwwroot/stock-selector/

# 5. 安装依赖
npm install --production

# 6. 启动服务
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd

# 7. 查看状态
pm2 ls
pm2 logs stock-selector
```

## 4. Nginx 配置

### 方式一：宝塔面板（最简单）

1. 宝塔面板 → 网站 → 添加站点
2. 域名：填写你的服务器公网 IP 或域名
3. 根目录：任意（站点根目录不影响，因为我们只用反向代理）
4. 点击「设置」→「反向代理」→「添加反向代理」
   - 代理名称：随意填写（如 stock-api
   - 目标 URL：`http://127.0.0.1:3000
   - 发送域名：`$host`（默认）
5. 保存，大功告成！

### 方式二：手动编辑 Nginx 配置

将 `server/deploy/nginx.conf` 文件内容复制到：
- CentOS: `/etc/nginx/conf.d/stock-selector.conf`
- Ubuntu: `/etc/nginx/sites-available/stock-selector`

然后：

```bash
# 检查配置
nginx -t

# 重载 Nginx
nginx -s reload
```

## 5. 前端 GitHub Pages 连接后端

部署完成后端之后，你需要告诉前端你的后端地址：

### 方式一：修改 `public/config.js 文件（推荐）

打开 `public/config.js`，修改：

```javascript
window.__APP_CONFIG__ = {
  // 改为你的服务器地址，例如：
  API_BASE_URL: "http://123.45.67.89",  // 或 "https://api.example.com"
  // ...
};
```

然后重新构建前端并推送 GitHub：

```bash
# 在你的本地开发机（不是服务器）执行：
cd /workspace
npm run build
# 将 dist 目录内容推送到 GitHub Pages
```

### 方式二：前端后端同一服务器

如果你的前端也部署在同一服务器上：

1. 把 `npm run build` 生成的 `dist` 目录内容放到 `/www/wwwroot/stock-selector-frontend`
2. 在宝塔面板新建一个站点，指向该目录
3. 在 `public/config.js` 中设置 `API_BASE_URL: ""`（空值，表示用当前域名）
4. Nginx 配置：将 `/api/*` 的请求转发到 `http://127.0.0.1:3000`

## 6. 定时任务说明

### 自动任务清单

| 时间（北京时间） | 任务 | 说明 |
|-----------|------|------|
| 每天 09:05 | 生成当日推荐（备用） | 开盘前检查并更新推荐数据 |
| 每天 15:10 | 生成下一交易日推荐 | 收盘后立即生成，是主要触发点 |
| 每天 15:25 | 复盘 | 计算上一交易日推荐的表现 |

### 手动触发

```bash
# 查看当前运行状态
pm2 logs stock-selector

# 手动触发生成推荐
curl -X POST http://127.0.0.1:3000/api/tasks/generate \
  -H "X-API-Key: your-secret-key"

# 手动触发复盘
curl -X POST http://127.0.0.1:3000/api/tasks/review \
  -H "X-API-Key: your-secret-key"
```

### API 密钥设置

在 `ecosystem.config.js` 中修改 `API_SECRET_KEY` 环境变量：

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 3000,
  ENABLE_SCHEDULER: 'true',
  ALLOWED_ORIGINS: '*',
  API_SECRET_KEY: '你的自定义密钥', // 在这里设置
}
```

然后重启服务：
```bash
pm2 restart stock-selector
```

## 7. 维护与升级

### 日常维护命令

```bash
# 查看服务状态
pm2 ls

# 查看实时日志
pm2 logs stock-selector

# 查看最近 100 行错误日志
pm2 logs stock-selector --lines 100 --err

# 重启服务
pm2 restart stock-selector

# 停止服务
pm2 stop stock-selector

# 删除服务（慎用）
pm2 delete stock-selector

# 清理所有日志
pm2 flush
```

### 更新代码到新版本

```bash
# 方式一：使用更新脚本（推荐）
cd /www/wwwroot/stock-selector/deploy
chmod +x update.sh
./update.sh

# 方式二：Git 拉取
cd /www/wwwroot/stock-selector
git pull origin main
npm install --production
pm2 restart stock-selector
```

### 数据库文件位置

| 文件 | 路径 |
|-----|------|
| 推荐数据 | `/www/wwwroot/stock-selector/data/stocks.db` |
| 日志文件 | `/www/wwwroot/stock-selector/logs/*.log` |
| PM2 日志 | `~/.pm2/logs/` |

### 备份数据库

```bash
# 备份
cp /www/wwwroot/stock-selector/data/stocks.db /www/wwwroot/stock-selector/data/stocks.db.bak.$(date +%Y%m%d)

# 恢复
cp /www/wwwroot/stock-selector/data/stocks.db.bak.20250101 /www/wwwroot/stock-selector/data/stocks.db
pm2 restart stock-selector
```

## 8. 常见问题排查

### Q1: pm2 命令找不到？

```bash
# 重新安装 PM2
npm install -g pm2
# 如果之前装过，软链接可能失效，用绝对路径试试
/usr/local/bin/pm2 ls
```

### Q2: curl 命令找不到？

```bash
# 安装 curl
yum install -y curl
```

### Q3: 端口 3000 被占用？

```bash
# 查看端口占用
netstat -tlnp | grep 3000
# 或者
lsof -i :3000

# 如果被占用，可以换个端口
# 编辑 ecosystem.config.js，把 PORT 改成其他端口（如 4000）
```

### Q4: 无法访问 API？

请按以下顺序排查：

1. **本地测试：
   ```bash
   curl http://127.0.0.1:3000/api/recommendations/latest
   ```
   ✅ 有返回 → Node.js 服务正常
   ❌ 没返回 → 服务没启动 → `pm2 logs` 查看错误

2. **服务器本地测试：
   ```bash
   curl http://你的服务器IP:3000/api/recommendations/latest
   ```
   ✅ 有返回 → 服务正常但防火墙问题
   ❌ 没返回 → 检查服务器防火墙：
   ```bash
   # CentOS 放行端口
   firewall-cmd --zone=public --add-port=3000/tcp --permanent
   firewall-cmd --reload
   
   # 阿里云/腾讯云 → 安全组放行 3000 端口
   ```

3. **浏览器测试**：访问 `http://你的服务器IP:3000/api/recommendations/latest`

### Q5: GitHub Pages 前端无法连接后端？

1. 检查 `public/config.js` 的 `API_BASE_URL` 是否正确设置
2. 如果你的服务器只有 HTTP，浏览器访问的是 HTTPS 的 GitHub Pages → 会被浏览器拦截（混合内容）
3. 解决办法：
   - 方案 A：服务器申请免费的域名 + 配置 HTTPS
   - 方案 B：把前端也部署到同一服务器（使用宝塔面板）
   - 方案 C：在 Nginx 配置中启用 HTTPS

### Q6: 推荐数据为空？

首次部署后不会立即有推荐，需要：

1. **定时任务会在每天 15:10 执行（收盘后）
2. **手动触发：
```bash
curl -X POST http://127.0.0.1:3000/api/tasks/generate \
  -H "X-API-Key: your-secret-key"
```
3. 检查日志确认数据获取是否正常：
```bash
pm2 logs stock-selector --lines 50
```

### Q7: 东方财富 API 访问受限？

东方财富 API 有时会限流，服务器 IP 被临时拉黑后会无法获取数据：

1. 等待几分钟后重试
2. 检查服务器是否能正常访问东方财富：
   ```bash
   curl -I "https://push2.eastmoney.com/api/qt/clist/get"
   ```
3. 如果返回 HTTP 200 → 正常；否则可能被限流或 IP 被拉黑

---

## 附：推荐服务器购买链接

- 阿里云：[https://www.aliyun.com](https://www.aliyun.com)
- 腾讯云：[https://cloud.tencent.com](https://cloud.tencent.com)
- 华为云：[https://www.huaweicloud.com](https://www.huaweicloud.com)

购买后安装 **宝塔面板** 可大幅降低运维难度。
