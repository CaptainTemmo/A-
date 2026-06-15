FROM node:20-alpine

WORKDIR /app

# 安装 SQLite 依赖 (better-sqlite3 需要 native bindings)
RUN apk add --no-cache python3 make g++

# 复制 package.json
COPY package*.json ./

# 安装依赖 (使用 --ignore-scripts 避免 native build 失败，再用 npm rebuild)
RUN npm install --ignore-scripts
RUN npm rebuild better-sqlite3

# 复制源码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/stocks.db
ENV ENABLE_SCHEDULER=true

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "src/index.js"]
