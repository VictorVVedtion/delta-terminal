# Husky Git Hooks 配置说明

本项目使用 [Husky](https://typicode.github.io/husky/) 来管理 Git 钩子，确保代码质量和提交规范。

## 已配置的钩子

### 1. pre-commit（提交前检查）

**执行时机**：每次 `git commit` 前自动运行

**检查内容**：
- ✨ **代码格式化与 Linting**（通过 lint-staged）
  - 自动修复 TypeScript/JavaScript 文件的 ESLint 问题
  - 自动格式化所有代码文件（使用 Prettier）

- 📦 **类型检查**（通过 Turborepo）
  - 对所有变更的工作区运行 TypeScript 类型检查
  - 使用 `--filter='[HEAD^1]'` 只检查受影响的包

- 🔍 **代码质量检查**（通过 Turborepo）
  - 对所有变更的工作区运行 ESLint
  - 确保代码符合项目编码规范

**文件位置**：`.husky/pre-commit`

### 2. commit-msg（提交信息验证）

**执行时机**：每次 `git commit` 时验证提交信息

**验证规则**：遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范

**提交格式**：
```
<type>(<scope>): <subject>

<body>

<footer>
```

**支持的类型**：
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构（既不是新功能也不是 bug 修复）
- `perf`: 性能优化
- `test`: 测试相关
- `build`: 构建系统或外部依赖变更
- `ci`: CI 配置文件和脚本变更
- `chore`: 其他不修改 src 或 test 的变更
- `revert`: 回退之前的提交

**提交示例**：
```bash
# 新功能
git commit -m "feat(ai): add new NLP processor for strategy analysis"

# Bug 修复
git commit -m "fix(trading): resolve order execution delay issue"

# 文档更新
git commit -m "docs: update API documentation for backtest engine"

# 重构
git commit -m "refactor(frontend): migrate to new state management"

# 性能优化
git commit -m "perf(data): optimize market data processing pipeline"
```

**文件位置**：`.husky/commit-msg`

## 配置文件

### commitlint.config.js

Commitlint 配置文件，定义了提交信息的验证规则。

**主要规则**：
- 提交类型必须是预定义的类型之一
- 提交类型必须小写
- 主题（subject）不能为空
- 主题不能以句号结尾
- 整个提交信息头部不超过 100 字符

## 本地开发

### 安装钩子

```bash
# 初次克隆项目后，运行
pnpm install

# 这会自动执行 prepare 脚本，安装 Husky 钩子
```

### 跳过钩子（仅特殊情况）

```bash
# 跳过 pre-commit 和 commit-msg 检查（不推荐）
git commit --no-verify -m "feat: emergency fix"

# 或使用简写
git commit -n -m "feat: emergency fix"
```

**⚠️ 警告**：仅在紧急情况下跳过钩子，并在后续尽快修复代码质量问题。

## 故障排查

### 钩子未执行

```bash
# 重新安装 Husky
pnpm run prepare

# 检查钩子文件权限
ls -la .husky/
# 应该看到 pre-commit 和 commit-msg 文件有执行权限（-rwx--x--x）
```

### 提交信息验证失败

确保提交信息格式正确：
- 类型必须是预定义的类型之一
- 使用小写类型
- 冒号后有空格
- 主题描述清晰

### Pre-commit 检查失败

1. **Lint-staged 失败**：
   - 检查 ESLint 和 Prettier 错误
   - 运行 `pnpm lint` 查看详细错误

2. **类型检查失败**：
   - 运行 `pnpm type-check` 查看 TypeScript 错误
   - 修复类型错误后重新提交

3. **Linting 失败**：
   - 运行 `pnpm lint` 查看 ESLint 错误
   - 部分错误可通过 `pnpm lint --fix` 自动修复

## 相关资源

- [Husky 官方文档](https://typicode.github.io/husky/)
- [Commitlint 官方文档](https://commitlint.js.org/)
- [Conventional Commits 规范](https://www.conventionalcommits.org/)
- [Lint-staged 文档](https://github.com/okonet/lint-staged)
- [Turborepo 文档](https://turbo.build/repo/docs)

## 维护者

Delta Terminal 开发团队

**最后更新**：2025-12-28
