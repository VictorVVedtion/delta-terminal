# 多阶段构建
FROM python:3.11-slim as builder

# 设置工作目录
WORKDIR /app

# 安装 Poetry
RUN pip install --no-cache-dir poetry==1.7.1

# 复制依赖文件
COPY pyproject.toml poetry.lock* ./

# 配置 Poetry - 不创建虚拟环境
RUN poetry config virtualenvs.create false

# 安装依赖（仅生产依赖）
RUN poetry install --no-dev --no-interaction --no-ansi


# 运行阶段
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 从构建阶段复制已安装的包
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# 复制应用代码
COPY src ./src

# 创建非 root 用户
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# 暴露端口
EXPOSE 8003

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8003/health')"

# 启动命令
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8003"]
