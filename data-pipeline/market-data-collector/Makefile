.PHONY: help install dev test lint format clean docker-build docker-run docker-stop

help:
	@echo "Market Data Collector - 可用命令:"
	@echo "  make install       - 安装依赖"
	@echo "  make dev           - 启动开发服务器"
	@echo "  make test          - 运行测试"
	@echo "  make lint          - 代码检查"
	@echo "  make format        - 代码格式化"
	@echo "  make clean         - 清理临时文件"
	@echo "  make docker-build  - 构建 Docker 镜像"
	@echo "  make docker-run    - 运行 Docker 容器"
	@echo "  make docker-stop   - 停止 Docker 容器"

install:
	poetry install

dev:
	poetry run python src/main.py

test:
	poetry run pytest -v --cov=src --cov-report=html

lint:
	poetry run ruff check src/
	poetry run mypy src/

format:
	poetry run black src/
	poetry run ruff check --fix src/

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type f -name "*.log" -delete
	rm -rf .pytest_cache
	rm -rf .coverage
	rm -rf htmlcov
	rm -rf dist
	rm -rf build
	rm -rf *.egg-info

docker-build:
	docker build -t market-data-collector:latest .

docker-run:
	docker-compose up -d

docker-stop:
	docker-compose down

docker-logs:
	docker-compose logs -f market-data-collector

db-migrate:
	docker-compose exec timescale psql -U postgres -d market_data -f /docker-entrypoint-initdb.d/init.sql

# 快速开发命令
quick-start: install docker-run
	@echo "等待服务启动..."
	@sleep 10
	@make dev

# 生产部署
deploy: docker-build docker-run
	@echo "服务已部署到 http://localhost:8003"
