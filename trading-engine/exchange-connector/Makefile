.PHONY: help install dev test lint format clean docker-build docker-up docker-down

help: ## 显示帮助信息
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## 安装依赖
	poetry install

dev: ## 启动开发服务器
	poetry run uvicorn src.main:app --reload --host 0.0.0.0 --port 8003

test: ## 运行测试
	poetry run pytest -v

test-cov: ## 运行测试并生成覆盖率报告
	poetry run pytest --cov=src --cov-report=html --cov-report=term

lint: ## 代码检查
	poetry run ruff check src tests
	poetry run mypy src

format: ## 格式化代码
	poetry run black src tests
	poetry run ruff check --fix src tests

clean: ## 清理临时文件
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache .coverage htmlcov dist build

docker-build: ## 构建 Docker 镜像
	docker build -t exchange-connector:latest .

docker-up: ## 启动 Docker 容器
	docker-compose up -d

docker-down: ## 停止 Docker 容器
	docker-compose down

docker-logs: ## 查看 Docker 日志
	docker-compose logs -f exchange-connector

docker-restart: ## 重启 Docker 容器
	docker-compose restart exchange-connector

init-env: ## 初始化环境变量文件
	cp .env.example .env
	@echo "请编辑 .env 文件填入必要配置"

generate-key: ## 生成加密密钥
	@python -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=' + Fernet.generate_key().decode())"

shell: ## 进入 Python shell
	poetry run python

check: lint test ## 代码检查和测试

all: clean install lint test ## 完整的构建流程
