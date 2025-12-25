FROM node:20-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# 安装依赖（包括开发依赖，用于构建）
RUN pnpm install --frozen-lockfile

# 生成 Prisma Client
RUN pnpm db:generate

# 复制源代码
COPY . .

# 构建
RUN pnpm build

# 生产环境镜像
FROM node:20-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# 仅安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 生成 Prisma Client
RUN pnpm db:generate

# 从构建阶段复制编译产物
COPY --from=base /app/dist ./dist

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3002

# 启动服务
CMD ["node", "dist/index.js"]
