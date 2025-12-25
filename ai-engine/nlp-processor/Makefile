# Makefile for NLP Processor

.PHONY: help install dev test format lint type-check clean docker-build docker-run

help:
	@echo "可用命令:"
	@echo "  make install       - 安装依赖"
	@echo "  make dev           - 启动开发服务器"
	@echo "  make test          - 运行测试"
	@echo "  make format        - 格式化代码"
	@echo "  make lint          - 代码检查"
	@echo "  make type-check    - 类型检查"
	@echo "  make clean         - 清理临时文件"
	@echo "  make docker-build  - 构建 Docker 镜像"
	@echo "  make docker-run    - 运行 Docker 容器"

install:
	poetry install

dev:
	poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8001

test:
	poetry run pytest -v --cov=src --cov-report=html

format:
	poetry run black src/ tests/
	poetry run ruff check --fix src/ tests/

lint:
	poetry run ruff check src/ tests/

type-check:
	poetry run mypy src/

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache
	rm -rf .mypy_cache
	rm -rf .ruff_cache
	rm -rf htmlcov
	rm -rf dist
	rm -rf build

docker-build:
	docker build -t nlp-processor:latest .

docker-run:
	docker run -p 8001:8001 --env-file .env nlp-processor:latest
