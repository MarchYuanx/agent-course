---
name: commit-message-zh
description: 生成符合约定式提交的中文 commit message。在用户请求生成/撰写提交信息、提交代码、或进行 git commit 时使用。
---

# 中文 Commit Message

## 规则

- **语言**：描述部分一律使用中文。
- **格式**：遵循 Conventional Commits，类型用英文（feat/fix/docs/style/refactor/test/chore），描述用中文。
- **风格**：简洁清晰，说明本次改动的目的或内容。

## 类型与示例

| 类型 | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | feat: 添加用户登录 |
| fix | 修复 bug | fix: 修复首页样式错位 |
| docs | 文档 | docs: 更新 README 安装说明 |
| style | 格式/样式 | style: 统一缩进为 2 空格 |
| refactor | 重构 | refactor: 抽离请求封装到 api 模块 |
| test | 测试 | test: 为 TodoList 添加单元测试 |
| chore | 构建/工具 | chore: 升级 vite 到 5.x |

## 示例

```
feat: 添加猪猪图鉴与解锁进度
fix: 修复 execute_command 在 Windows 下 DEP0190 警告
docs: 为 all-tools.mjs 补充中文注释
```
