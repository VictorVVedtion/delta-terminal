.PHONY: help install dev test lint format clean docker-build docker-run

help: ## 显示帮助信息
	@echo "可用命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

install: ## 安装依赖
	poetry install

dev: ## 启动开发服务器
	poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8002

test: ## 运行测试
	poetry run pytest -v

test-cov: ## 运行测试并生成覆盖率报告
	poetry run pytest --cov=src --cov-report=html --cov-report=term

lint: ## 代码检查
	poetry run ruff check src/
	poetry run mypy src/

format: ## 格式化代码
	poetry run black src/
	poetry run ruff check --fix src/

clean: ## 清理临时文件
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage

docker-build: ## 构建Docker镜像
	docker build -t delta-strategy-generator:latest .

docker-run: ## 运行Docker容器
	docker-compose up -d

docker-stop: ## 停止Docker容器
	docker-compose down

docker-logs: ## 查看Docker日志
	docker-compose logs -f strategy-generator

prod: ## 生产环境启动
	poetry run uvicorn src.main:app --host 0.0.0.0 --port 8002 --workers 4
