# YuanBot 原宝

智能对话应用，NestJS 后端 + React 前端，支持流式输出与多身份切换。

## 环境要求

- Node.js 18+
- pnpm（推荐使用 `corepack enable` 启用）

## 配置

1. 复制 `server/.env.example` 为 `server/.env`
2. 填入你的 API 配置（支持 OpenAI 兼容接口）：

```
API_KEY=your_api_key
BASE_URL=https://api.example.com/v1
MODEL_NAME=your-model-name
```

## 运行

### 开发模式

**安装依赖（在 chatbot 根目录）：**
```bash
cd chatbot
pnpm install
```

**终端 1 - 后端：**
```bash
pnpm dev:server
```

**终端 2 - 前端：**
```bash
pnpm dev:web
```

浏览器访问 http://localhost:5173

### 生产构建

```bash
cd chatbot
pnpm build
```

或分别构建：
```bash
pnpm build:server   # 后端
pnpm build:web      # 前端
```

前端构建产物在 `web/dist`，可部署到任意静态托管；后端需单独运行 `node dist/main.js`。

## 技术栈

- 后端：NestJS、ConfigModule、原生 fetch 流式转发
- 前端：Vite、React、SSE 解析
- 通信：POST /api/chat，SSE 流式响应
