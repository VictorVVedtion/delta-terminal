# 多阶段构建 Dockerfile
FROM python:3.11-slim as builder

# 设置工作目录
WORKDIR /app

# 安装 Poetry
RUN pip install --no-cache-dir poetry==1.7.1

# 复制依赖文件
COPY pyproject.toml poetry.lock* ./

# 配置 Poetry
RUN poetry config virtualenvs.create false

# 安装依赖
RUN poetry install --no-dev --no-interaction --no-ansi

# 最终镜像
FROM python:3.11-slim

# 设置环境变量
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# 创建非 root 用户
RUN useradd -m -u 1000 appuser

# 设置工作目录
WORKDIR /app

# 从构建器复制依赖
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 复制应用代码
COPY --chown=appuser:appuser . .

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 8001

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8001/health')"

# 启动命令
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
