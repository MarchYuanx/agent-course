/**
 * RAG 示例：基于故事片段的检索与问答
 * 将多段文档向量化存入内存向量库，根据问题检索相关片段，再交给大模型生成回答。
 */
import "dotenv/config";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

// 聊天模型：用于根据检索结果生成最终回答
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

// 故事文档列表：每段包含 pageContent（正文）与 metadata（章节、角色、类型、心情等）
const documents = [
  new Document({
    pageContent: `丰川祥子是一名高中生，外表冷淡寡言，内心却对音乐和钢琴有着强烈的执着。她曾是月之森女子学园的学生，后来转学，组建了乐队 MyGO!!!!!。祥子不轻易向人敞开心扉，但对待音乐和伙伴时会露出少见的温柔与坚定。`,
    metadata: {
      chapter: 1,
      character: "丰川祥子",
      type: "角色介绍",
      mood: "内敛",
    },
  }),
  new Document({
    pageContent: `三角初华是 Ave Mujica 的成员，也是祥子的青梅竹马与重要的人。初华性格开朗、善于沟通，在舞台上和生活中都像太阳一样温暖。她一直关注着祥子的选择与成长，两人之间有着从童年延续至今的羁绊。`,
    metadata: {
      chapter: 2,
      character: "三角初华",
      type: "角色介绍",
      mood: "温暖",
    },
  }),
  new Document({
    pageContent: `祥子决定离开月之森、走上自己的音乐道路时，初华没有阻拦，而是默默支持。初华对祥子说："无论你选择哪条路，我都会在你身边。你弹琴的样子，从以前到现在都是我最喜欢的。"祥子别过脸，只轻轻"嗯"了一声，耳根却微微发红。`,
    metadata: {
      chapter: 3,
      character: "祥子和初华",
      type: "羁绊情节",
      mood: "温柔",
    },
  }),
  new Document({
    pageContent: `MyGO!!!!! 和 Ave Mujica 虽然路线不同，但祥子和初华私下仍会见面。有时是初华带便当来排练室找祥子，有时是祥子弹完琴后和初华一起喝饮料。两人很少说煽情的话，却总能在沉默中理解对方的心意。`,
    metadata: {
      chapter: 4,
      character: "祥子和初华",
      type: "日常情节",
      mood: "默契",
    },
  }),
  new Document({
    pageContent: `有一次祥子练琴练到很晚，初华一直在门外等。祥子出来时惊讶地问为什么还不回去，初华笑着说："想听你弹完最后一首。"那天夜里两人一起走回家，初华说："祥子，你的音乐里已经有你想表达的东西了。"祥子没有回答，却悄悄握紧了初华的手。`,
    metadata: {
      chapter: 5,
      character: "祥子和初华",
      type: "高潮转折",
      mood: "心动",
    },
  }),
  new Document({
    pageContent: `祥子和初华约定，无论将来是继续做乐队、升学还是走向别的人生，都要一起看同一片天空。初华说："就像小时候那样。"祥子终于露出难得的笑容，点头说："嗯，说好了。"`,
    metadata: {
      chapter: 6,
      character: "祥子和初华",
      type: "结局",
      mood: "约定",
    },
  }),
  new Document({
    pageContent: `后来，祥子依然在 MyGO!!!!! 里弹琴、写歌，初华也在 Ave Mujica 的舞台上发光。她们不常把"重要"挂在嘴边，却会在对方需要时出现。祥子有时会想，能遇见初华，大概是自己做过的最对的选择之一。`,
    metadata: {
      chapter: 7,
      character: "祥子和初华",
      type: "尾声",
      mood: "温馨",
    },
  }),
];

// 将文档向量化并存入内存向量库（未持久化，进程结束即清空）
const vectorStore = await MemoryVectorStore.fromDocuments(
  documents,
  embeddings,
);

// 检索器：根据问题返回最相关的 k 条文档
const retriever = vectorStore.asRetriever({ k: 3 });

// 待回答的问题列表
const questions = [
  "祥子和初华是怎么认识的？",
  "初华对祥子说过什么重要的话？",
];

// 对每个问题：检索 → 打印检索结果与相似度 → 拼 prompt → 调用模型得到回答
for (const question of questions) {
  console.log("=".repeat(80));
  console.log(`问题: ${question}`);
  console.log("=".repeat(80));

  // 按问题语义检索最相关的 k 条文档
  const retrievedDocs = await retriever.invoke(question);

  // 再查一遍带相似度分数，用于打印（距离越小越相似，转为 1 - 距离 表示相似度）
  const scoredResults = await vectorStore.similaritySearchWithScore(question, 3);

  console.log("\n【检索到的文档及相似度评分】");
  retrievedDocs.forEach((doc, i) => {
    const scoredResult = scoredResults.find(([scoredDoc]) =>
      scoredDoc.pageContent === doc.pageContent
    );
    const score = scoredResult ? scoredResult[1] : null;
    const similarity = score !== null ? (1 - score).toFixed(4) : "N/A";

    console.log(`\n[文档 ${i + 1}] 相似度: ${similarity}`);
    console.log(`内容: ${doc.pageContent}`);
    console.log(`元数据: 章节=${doc.metadata.chapter}, 角色=${doc.metadata.character}, 类型=${doc.metadata.type}, 心情=${doc.metadata.mood}`);
  });

  // 将检索到的片段拼成上下文，加上角色设定与问题，组成 prompt
  const context = retrievedDocs
    .map((doc, i) => `[片段${i + 1}]\n${doc.pageContent}`)
    .join("\n\n━━━━━\n\n");

  const prompt = `你是一个讲角色故事的老师。基于以下关于丰川祥子和三角初华的故事片段回答问题，用温暖生动的语言。如果故事中没有提到，就说"这个故事里还没有提到这个细节"。

故事片段:
${context}

问题: ${question}

老师的回答:`;

  console.log("\n【AI 回答】");
  const response = await model.invoke(prompt);
  console.log(response.content);
  console.log("\n");
}