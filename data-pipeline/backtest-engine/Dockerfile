# Delta Terminal - Backtest Engine Dockerfile
FROM python:3.11-slim

LABEL maintainer="Delta Terminal Team"
LABEL description="量化回测引擎"

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libhdf5-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 安装Poetry
RUN pip install --no-cache-dir poetry==1.7.1

# 复制项目文件
COPY pyproject.toml poetry.lock* ./

# 配置Poetry (不创建虚拟环境)
RUN poetry config virtualenvs.create false

# 安装依赖
RUN poetry install --no-dev --no-interaction --no-ansi

# 复制源代码
COPY src/ ./src/
COPY .env* ./

# 创建必要目录
RUN mkdir -p /app/logs /app/reports

# 暴露端口
EXPOSE 8003

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8003/health || exit 1

# 启动命令
CMD ["python", "-m", "src.main"]
