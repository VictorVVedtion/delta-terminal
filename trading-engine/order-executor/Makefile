.PHONY: help install dev test lint format clean docker-build docker-up docker-down

help: ## 显示帮助信息
	@echo "Order Executor - 可用命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## 安装依赖
	poetry install

dev: ## 启动开发服务器
	poetry run python -m src.main

test: ## 运行测试
	poetry run pytest tests/ -v

test-cov: ## 运行测试并生成覆盖率报告
	poetry run pytest tests/ --cov=src --cov-report=html --cov-report=term

lint: ## 代码检查
	poetry run ruff check src/
	poetry run mypy src/

format: ## 代码格式化
	poetry run black src/ tests/
	poetry run ruff check src/ --fix

clean: ## 清理临时文件
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache .coverage htmlcov/ dist/ build/

docker-build: ## 构建 Docker 镜像
	docker build -t delta-order-executor:latest .

docker-up: ## 启动 Docker Compose
	docker-compose up -d

docker-down: ## 停止 Docker Compose
	docker-compose down

docker-logs: ## 查看 Docker 日志
	docker-compose logs -f order-executor

docker-restart: docker-down docker-up ## 重启 Docker 服务
