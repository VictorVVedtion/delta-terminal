# Delta Terminal - NLP Processor Dockerfile
FROM python:3.11-slim

LABEL maintainer="Delta Terminal Team"
LABEL description="NLP 自然语言处理服务"

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
EXPOSE 8001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8001}/health || exit 1

# 设置 PYTHONPATH
ENV PYTHONPATH=/app

# 启动命令 - 使用 shell 形式以支持环境变量展开
CMD uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8001}
