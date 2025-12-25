# Multi-stage build for Market Data Collector

# Stage 1: Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装 Poetry
RUN pip install poetry==1.7.1

# 复制依赖文件
COPY pyproject.toml poetry.lock* ./

# 配置 Poetry 不创建虚拟环境
RUN poetry config virtualenvs.create false

# 安装依赖
RUN poetry install --no-interaction --no-ansi --no-root --only main

# Stage 2: Runtime stage
FROM python:3.11-slim

WORKDIR /app

# 安装运行时依赖
RUN apt-get update && apt-get install -y \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# 从构建阶段复制 Python 包
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 复制应用代码
COPY . .

# 创建非 root 用户
RUN useradd -m -u 1000 collector && \
    chown -R collector:collector /app

USER collector

# 暴露端口
EXPOSE 8003 9003

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8003/health || exit 1

# 启动命令
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8003"]
