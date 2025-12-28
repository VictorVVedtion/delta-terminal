.PHONY: help install dev test lint format clean docker-build docker-run

help:
	@echo "Delta Terminal - Signal Analyzer 模块"
	@echo ""
	@echo "可用命令："
	@echo "  make install       - 安装依赖"
	@echo "  make dev          - 启动开发服务器"
	@echo "  make test         - 运行测试"
	@echo "  make lint         - 代码检查"
	@echo "  make format       - 格式化代码"
	@echo "  make clean        - 清理缓存文件"
	@echo "  make docker-build - 构建 Docker 镜像"
	@echo "  make docker-run   - 运行 Docker 容器"

install:
	poetry install

dev:
	poetry run uvicorn src.main:app --host 0.0.0.0 --port 8007 --reload

test:
	poetry run pytest

lint:
	poetry run ruff check src tests
	poetry run mypy src

format:
	poetry run black src tests
	poetry run ruff check --fix src tests

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf htmlcov .coverage

docker-build:
	docker build -t delta-terminal/signal-analyzer:latest .

docker-run:
	docker run -p 8007:8007 \
		--env-file .env \
		--name signal-analyzer \
		delta-terminal/signal-analyzer:latest
