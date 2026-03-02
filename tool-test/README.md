# Tool 学习笔记

本目录是 **Agent 课程 - 工具（Tool）** 部分的练习与示例，涵盖：LangChain 内置工具、MCP（Model Context Protocol）自建/第三方 Server、多服务串联与 Agent 循环。

---

## 目录结构

```
tool-test/
├── src/
│   ├── hello.mjs               # 最简示例：dotenv 加载 .env + ChatOpenAI 单轮对话（无工具）
│   ├── all-tools.mjs          # LangChain 内置工具集：read_file / write_file / execute_command / list_directory
│   ├── tool-file-read.mjs     # 最小示例：单工具 read_file + Agent 循环
│   ├── my-mcp-server.mjs      # 自建 MCP Server：query_user 工具 + 使用指南资源
│   ├── langchain-mcp-test.mjs # LangChain + 单 MCP：拉取工具与资源，驱动模型查用户
│   ├── mcp-test.mjs           # 多 MCP 服务：my-mcp、高德地图、filesystem、chrome-devtools + 工具异常捕获
│   ├── mini-cursor.mjs        # 「迷你 Cursor」：四件套工具 + 项目管理助手 System 提示，可创建/改项目（如 React Todo）
│   ├── node-exec.mjs          # 裸 spawn 执行命令示例（Windows 注意 shell）
│   └── ...
├── .env                       # API Key、ALLOWED_PATHS 等配置
├── package.json
└── README.md                  # 本说明
```

---

## 核心概念

### 1. LangChain 工具（Tool）

- 使用 `@langchain/core/tools` 的 `tool()` 定义：实现函数 + 名称、描述、Zod schema。
- 通过 `model.bindTools(tools)` 绑定到模型，模型在对话中决定何时调用、传什么参数。
- Agent 循环：发用户消息 → 模型返回 `tool_calls` → 执行工具 → 将结果以 `ToolMessage` 追加 → 再次调用模型，直到模型不再发起工具调用并给出最终回复。

### 2. MCP（Model Context Protocol）

- 标准化「模型可调用的工具与资源」的协议；Server 通过 stdio/HTTP 暴露工具与资源，Client 拉取后可供 LLM 使用。
- **自建 Server**（如 `my-mcp-server.mjs`）：`@modelcontextprotocol/sdk`，`McpServer` + `registerTool` / `registerResource`，`StdioServerTransport`。
- **LangChain 集成**：`@langchain/mcp-adapters` 的 `MultiServerMCPClient`，配置多个 MCP Server（command+args 或 url），`getTools()` 得到统一工具列表，可配合 `listResources` / `readResource` 做系统提示。

---

## 脚本说明

| 文件 | 作用 |
|------|------|
| **hello.mjs** | 最简入门：用 `dotenv` 加载 `.env`，创建 `ChatOpenAI` 实例（API Key、Base URL、模型名均从环境变量读），单次 `invoke` 对话，无工具。适合验证环境与 API 是否打通。 |
| **all-tools.mjs** | 定义并导出 4 个 LangChain 工具：读文件、写文件、执行命令、列目录；供其他脚本绑定到模型。 |
| **tool-file-read.mjs** | 仅用 `read_file` 一个工具，演示「用户问 → 模型调工具 → ToolMessage → 最终回答」的最小闭环。 |
| **my-mcp-server.mjs** | 自建 MCP Server：提供 `query_user`（按 userId 查用户）、资源 `docs://guide`（使用指南）；用 stdio 通信。 |
| **langchain-mcp-test.mjs** | 只连 `my-mcp-server`，拉取工具 + 读取资源作为 System 上下文，运行 Agent 查用户等。 |
| **mcp-test.mjs** | 多 MCP：本地 my-mcp、高德地图（HTTP）、filesystem、chrome-devtools；带工具调用 try/catch，避免单次工具失败导致进程崩溃。 |
| **mini-cursor.mjs** | 「迷你 Cursor」：使用 all-tools 四件套（read_file / write_file / execute_command / list_directory），配合「项目管理助手」System 提示（含 workingDirectory 规则、React 写文件规则），由模型自主创建/修改项目；示例任务为用 Vite 创建完整 React TodoList（含样式与动画）。 |
| **node-exec.mjs** | 使用 `child_process.spawn` 执行命令的简单示例；Windows 下可设 `shell: true` 或指定 PowerShell。 |

---

## 环境配置

### `.env` 与 dotenv

- **`.env`**：放在项目根目录（与 `package.json` 同级）的环境变量文件，格式为 `KEY=value`，一行一个。**不要提交到 Git**（已加入 `.gitignore`），用于存放 API Key、Base URL 等敏感或本地配置。
- **dotenv**：通过 [dotenv](https://www.npmjs.com/package/dotenv) 在运行时把 `.env` 里的变量加载到 `process.env`，这样代码里可用 `process.env.OPENAI_API_KEY` 等。
- **两种用法**：
  - **`import 'dotenv/config'`**：在入口最顶部引入，会自动执行加载，无需再写 `dotenv.config()`；本仓库多数脚本采用这种方式。
  - **`import dotenv from 'dotenv'; dotenv.config();`**：显式调用，可传入 `{ path: '.env' }` 等选项；`hello.mjs` 采用这种写法，便于理解「先加载再读环境变量」的顺序。

### 需要配置的变量

- 复制或新建 `.env`，按需配置：
  - **通用**：`OPENAI_API_KEY`、`OPENAI_BASE_URL`、`MODEL_NAME`（若用 DeepSeek/其他兼容 API，按需设置）
  - 使用高德 MCP 时：`AMAP_MAPS_API_KEY`
  - 使用 filesystem MCP 时：`ALLOWED_PATHS`（可选，逗号分隔路径；未配置时部分实现会回退到当前工作目录或需在代码中给默认值）
- 安装依赖：`pnpm install`（见 `package.json`）。dotenv 已在 `package.json` 的 dependencies 中。

---

## 运行方式

```bash
# 最简：加载 .env 并单轮对话（无工具）
node src/hello.mjs

# 仅自建 MCP + 查用户
node src/langchain-mcp-test.mjs

# 多 MCP（高德 / 文件系统 / Chrome DevTools）+ Agent 任务
node src/mcp-test.mjs

# 迷你 Cursor：四件套工具自动创建/修改项目（如 React TodoList）
node src/mini-cursor.mjs
```

按需修改各脚本末尾的 `runAgentWithTools("你的问题")` 或入口调用。

---

## 常见问题

1. **`ALLOWED_PATHS` 报错 `Cannot read properties of undefined (reading 'split')`**  
   未设置环境变量时不要直接对 `process.env.ALLOWED_PATHS` 调 `.split()`。应使用可选链与默认值，例如：  
   `(process.env.ALLOWED_PATHS?.split(',') ?? [])` 或未配置时使用 `[process.cwd()]`。

2. **MCP 工具返回错误导致进程崩溃（如 `ToolException: ... returned an error`）**  
   LangChain 的 MCP 适配器在工具返回错误时会抛出异常。在 `runAgentWithTools` 里对 `foundTool.invoke(...)` 做 **try/catch**，将错误信息作为 ToolMessage 内容回传给模型，并打日志，避免进程退出。

3. **Chrome DevTools MCP 启动时的隐私/统计提示**  
   终端里关于 “exposes content”“CrUX”“usage statistics” 的说明是启动提示，非报错。需要时可对 chrome-devtools 进程加 `--no-performance-crux`、`--no-usage-statistics` 等参数。

4. **Filesystem 提示 “Client does not support MCP Roots”**  
   表示当前客户端未使用 MCP Roots 协议，服务端使用命令行传入的 `ALLOWED_PATHS` 作为允许目录，属正常行为。

---

## 小结

- **工具**：LangChain `tool()` + `bindTools` + Agent 循环（HumanMessage → tool_calls → ToolMessage → 再调用）。
- **MCP**：自建 Server（工具 + 资源）+ LangChain `MultiServerMCPClient` 拉工具/资源，统一给模型用。
- **多服务与健壮性**：多 MCP 配置、工具调用 try/catch、环境变量默认值，便于本地与课程演示。

更多 MCP 规范与生态见 [Model Context Protocol](https://modelcontextprotocol.io/)。
