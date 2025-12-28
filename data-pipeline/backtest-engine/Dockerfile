# Delta Terminal - Backtest Engine Dockerfile
FROM python:3.11-slim

LABEL maintainer="Delta Terminal Team"
LABEL description="量化回测引擎"

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 复制依赖文件
COPY requirements.txt ./

# 安装 Python 依赖
RUN pip install --no-cache-dir -r requirements.txt

# 复制源代码
COPY src/ ./src/

# 暴露端口（Railway 会覆盖）
EXPOSE 8003

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8003}/health || exit 1

# 启动命令
CMD ["python", "-m", "src.main"]
