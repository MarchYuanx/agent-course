/**
 * 演示：让 LLM 通过 read_file 工具读取本地文件并解释代码
 */
import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import fs from 'node:fs/promises';
import { z } from 'zod';

// 创建聊天模型实例（temperature=0 保证输出稳定）
const model = new ChatOpenAI({ 
  modelName: process.env.MODEL_NAME || "qwen-coder-turbo",
  apiKey: process.env.OPENAI_API_KEY,
  temperature: 0,
  configuration: {
      baseURL: process.env.OPENAI_BASE_URL,
  },
});

// 定义 read_file 工具：根据路径读取文件内容并返回给模型
const readFileTool = tool(
  async ({ filePath }) => {
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`  [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`);
    return `文件内容:\n${content}`;
  },
  {
    name: 'read_file',
    description: '用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）。',
    schema: z.object({
      filePath: z.string().describe('要读取的文件路径'),
    }),
  }
);

const tools = [readFileTool];

// 将工具绑定到模型，模型可据此决定何时调用 read_file
const modelWithTools = model.bindTools(tools);

// 系统提示 + 用户问题，驱动模型先调用 read_file 再回答
const messages = [
  new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解释代码。

工作流程：
1. 用户要求读取文件时，立即调用 read_file 工具
2. 等待工具返回文件内容
3. 基于文件内容进行分析和解释

可用工具：
- read_file: 读取文件内容（使用此工具来获取文件内容）
`),
  new HumanMessage('请读取 ./src/tool-file-read.mjs 文件内容并解释代码')
];

// 首次调用：模型会返回 tool_calls（请求执行 read_file）
let response = await modelWithTools.invoke(messages);

messages.push(response);

// 若模型请求调用工具，则执行工具并把结果写回消息，再让模型根据结果继续生成
while (response.tool_calls && response.tool_calls.length > 0) {
  console.log(`\n[检测到 ${response.tool_calls.length} 个工具调用]`);

  // 并行执行本轮所有工具调用
  const toolResults = await Promise.all(
    response.tool_calls.map(async (toolCall) => {
      const tool = tools.find(t => t.name === toolCall.name);
      if (!tool) {
        return `错误: 找不到工具 ${toolCall.name}`;
      }

      console.log(`  [执行工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`);
      try {
        const result = await tool.invoke(toolCall.args);
        return result;
      } catch (error) {
        return `错误: ${error.message}`;
      }
    })
  );

  // 把每个工具的执行结果以 ToolMessage 形式追加到对话历史
  response.tool_calls.forEach((toolCall, index) => {
    messages.push(
      new ToolMessage({
        content: toolResults[index],
        tool_call_id: toolCall.id,
      })
    );
  });

  // 带着工具结果再次调用模型，由模型生成最终解释或后续工具调用
  response = await modelWithTools.invoke(messages);
}

console.log('\n[最终回复]');
console.log(response.content);