// 加载环境变量
import dotenv from 'dotenv';
import { ChatOpenAI } from '@langchain/openai';

// 从 .env 文件读取配置
dotenv.config();

// 创建 LangChain 的 OpenAI 兼容聊天模型实例
const model = new ChatOpenAI({
  modelName: process.env.MODEL_NAME || "qwen-coder-turbo",  // 模型名称，默认通义千问
  apiKey: process.env.OPENAI_API_KEY,                       // API 密钥
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,                    // API 基础地址
  },
});

// 调用模型并获取回复
const response = await model.invoke("介绍下自己");
console.log(response.content);