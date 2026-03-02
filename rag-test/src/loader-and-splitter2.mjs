/**
 * Loader + Splitter + RAG 示例
 * 用 Cheerio 抓取网页正文 → RecursiveCharacterTextSplitter 按长度与标点切分 → 向量化入库 → 检索问答。
 */
import "dotenv/config";
import "cheerio";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

// 聊天模型：根据检索到的片段生成回答
const model = new ChatOpenAI({
  temperature: 0,
  model: process.env.MODEL_NAME,
  apiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: process.env.OPENAI_BASE_URL,
  },
});

// 嵌入模型：将文档与问题转为向量，供相似度检索
const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.EMBEDDING_API_KEY,
  model: process.env.EMBEDDING_MODEL_NAME,
  dimensions: process.env.EMBEDDING_DIMENSIONS,
  configuration: {
    baseURL: process.env.EMBEDDING_BASE_URL,
  },
});

// 网页加载器：用 Cheerio 抓取指定 URL，只保留 selector 匹配的节点文本（此处为正文段落）
const cheerioLoader = new CheerioWebBaseLoader(
  "https://juejin.cn/post/7233327509919547452",
  {
    selector: ".main-area p",
  }
);

const documents = await cheerioLoader.load();

console.assert(documents.length === 1);
console.log(`Total characters: ${documents[0].pageContent.length}`);

// 递归按字符切分：优先在句号、叹号、问号处断开，控制每块长度与块间重叠，避免把一句拆散
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,      // 每块目标最大字符数
  chunkOverlap: 50,    // 相邻块重叠字符数，便于上下文衔接
  separators: ["。", "！", "？"],  // 分割符优先级，先按句断再按长度
});

const splitDocuments = await textSplitter.splitDocuments(documents);

console.log(splitDocuments);
console.log(`文档分割完成，共 ${splitDocuments.length} 个分块\n`);

// 将切分后的文档向量化并写入内存向量库
console.log("正在创建向量存储...");
const vectorStore = await MemoryVectorStore.fromDocuments(
  splitDocuments,
  embeddings,
);
console.log("向量存储创建完成\n");

// 检索器：按问题语义返回最相关的 k 条文档
const retriever = vectorStore.asRetriever({ k: 2 });

// 待回答的问题列表
const questions = [
  "父亲的去世对作者的人生态度产生了怎样的根本性逆转？"
];

// 对每个问题：相似度检索 → 打印检索结果 → 拼 prompt → 调用 chat 模型得到回答
for (const question of questions) {
  console.log("=".repeat(80));
  console.log(`问题: ${question}`);
  console.log("=".repeat(80));

  // 一次调用同时拿到文档和相似度分数（距离越小越相似，转为 1 - 距离 表示相似度）
  const scoredResults = await vectorStore.similaritySearchWithScore(question, 2);

  const retrievedDocs = scoredResults.map(([doc]) => doc);

  console.log("\n【检索到的文档及相似度评分】");
  scoredResults.forEach(([doc, score], i) => {
    const similarity = (1 - score).toFixed(4);

    console.log(`\n[文档 ${i + 1}] 相似度: ${similarity}`);
    console.log(`内容: ${doc.pageContent}`);
    if (doc.metadata && Object.keys(doc.metadata).length > 0) {
      console.log(`元数据:`, doc.metadata);
    }
  });

  // 将检索到的片段拼成上下文，加上角色设定与问题，组成 prompt
  const context = retrievedDocs
    .map((doc, i) => `[片段${i + 1}]\n${doc.pageContent}`)
    .join("\n\n━━━━━\n\n");

  const prompt = `你是一个文章辅助阅读助手，根据文章内容来解答：

文章内容：
${context}

问题: ${question}

你的回答:`;

  console.log("\n【AI 回答】");
  const response = await model.invoke(prompt);
  console.log(response.content);
  console.log("\n");
}