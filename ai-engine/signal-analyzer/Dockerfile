FROM python:3.11-slim

WORKDIR /app

# 安装系统依赖（TA-Lib 需要）
RUN apt-get update && apt-get install -y \
    build-essential \
    wget \
    && rm -rf /var/lib/apt/lists/*

# 安装 TA-Lib C 库
RUN wget http://prdownloads.sourceforge.net/ta-lib/ta-lib-0.4.0-src.tar.gz && \
    tar -xzf ta-lib-0.4.0-src.tar.gz && \
    cd ta-lib/ && \
    ./configure --prefix=/usr && \
    make && \
    make install && \
    cd .. && \
    rm -rf ta-lib ta-lib-0.4.0-src.tar.gz

# 安装 Poetry
RUN pip install poetry==1.7.1

# 配置 Poetry
RUN poetry config virtualenvs.create false

# 复制依赖文件
COPY pyproject.toml poetry.lock* ./

# 安装依赖
RUN poetry install --no-dev --no-interaction --no-ansi

# 复制源代码
COPY src/ ./src/

# 暴露端口
EXPOSE 8007

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8007/health')"

# 启动命令
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8007"]
