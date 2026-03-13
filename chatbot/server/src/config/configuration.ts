export default () => ({
  apiKey: process.env.API_KEY,
  baseUrl: process.env.BASE_URL || 'https://api.deepseek.com/v1',
  modelName: process.env.MODEL_NAME || 'deepseek-chat',
});
