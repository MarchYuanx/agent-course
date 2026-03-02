/**
 * LangChain + MCP 测试脚本
 * 通过 LangChain 调用本地 MCP Server 的工具与资源，驱动大模型完成“查用户”等任务。
 */
import 'dotenv/config';
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import { ChatOpenAI } from '@langchain/openai';
import chalk from 'chalk';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

// 初始化对话模型（从环境变量读取 API 配置）
const model = new ChatOpenAI({ 
    modelName: process.env.MODEL_NAME || "qwen-coder-turbo", 
    apiKey: process.env.OPENAI_API_KEY,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
});

// 配置并启动 MCP 客户端，连接本地 my-mcp-server
const mcpClient = new MultiServerMCPClient({
    mcpServers: {
        'my-mcp-server': {
            command: "node",
            args: [
                "E:\\agent-course\\tool-test\\src\\my-mcp-server.mjs"
            ]
        }
    }
});

// 从 MCP Server 拉取工具并绑定到模型
const tools = await mcpClient.getTools();
const modelWithTools = model.bindTools(tools);

// 读取所有 MCP 资源内容，作为系统上下文供模型使用
const res = await mcpClient.listResources();
let resourceContent = '';
for (const [serverName, resources] of Object.entries(res)) {
    for (const resource of resources) {
        const content = await mcpClient.readResource(serverName, resource.uri);
        resourceContent += content[0].text;
    }
}

/**
 * 带工具调用的 Agent 循环：根据用户 query 调用模型，若有 tool_calls 则执行并继续对话
 * @param {string} query - 用户问题
 * @param {number} maxIterations - 最大迭代次数，防止死循环
 * @returns {Promise<string>} 最终回复内容
 */
async function runAgentWithTools(query, maxIterations = 30) {
    const messages = [
        new SystemMessage(resourceContent),  // 系统消息：MCP 资源内容
        new HumanMessage(query)
    ];

    for (let i = 0; i < maxIterations; i++) {
        console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));
        const response = await modelWithTools.invoke(messages);
        messages.push(response);

        // 无工具调用则视为最终回复，结束循环
        if (!response.tool_calls || response.tool_calls.length === 0) {
            console.log(`\n✨ AI 最终回复:\n${response.content}\n`);
            return response.content;
        }

        console.log(chalk.bgBlue(`🔍 检测到 ${response.tool_calls.length} 个工具调用`));
        console.log(chalk.bgBlue(`🔍 工具调用: ${response.tool_calls.map(t => t.name).join(', ')}`));
        // 依次执行工具调用，并将结果以 ToolMessage 追加到对话
        for (const toolCall of response.tool_calls) {
            const foundTool = tools.find(t => t.name === toolCall.name);
            if (foundTool) {
                const toolResult = await foundTool.invoke(toolCall.args);
                messages.push(new ToolMessage({
                    content: toolResult,
                    tool_call_id: toolCall.id,
                }));
            }
        }
    }

    return messages[messages.length - 1].content;
}

// 执行示例：查询用户 002
await runAgentWithTools("查一下用户 002 的信息");
// await runAgentWithTools("MCP Server 的使用指南是什么");

await mcpClient.close();