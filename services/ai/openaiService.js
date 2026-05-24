const OpenAI = require("openai");
const AppError = require("../../utils/AppError");

let client = null;

const getClient = () => {
  if (client) return client;

  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  return client;
};

const handleOpenAIError = (error) => {
  console.error("OPENAI ERROR:", error?.message);

  if (error?.status === 429 || error?.code === "insufficient_quota") {
    return "AI quota exceeded";
  }

  if (error?.status === 401) {
    return "Invalid OpenAI API key";
  }

  return "AI service unavailable";
};

const chat = async (messages, opts = {}) => {
  try {
    const ai = getClient();

    if (!ai) {
      return "AI service not configured";
    }

    const response = await ai.chat.completions.create({
      model: opts.model || "gpt-4o-mini",
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens || 1500,
      messages,
    });

    return response?.choices?.[0]?.message?.content?.trim() || "";
  } catch (error) {
    return handleOpenAIError(error);
  }
};

const chatStream = async (messages, opts = {}) => {
  try {
    const ai = getClient();

    if (!ai) {
      throw new AppError("AI service not configured", 500);
    }

    return await ai.chat.completions.create({
      model: opts.model || "gpt-4o-mini",
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens || 1500,
      stream: true,
      messages,
    });
  } catch (error) {
    throw new AppError(handleOpenAIError(error), 500);
  }
};

const prompt = async (systemPrompt, userContent, opts = {}) => {
  try {
    return await chat(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      opts,
    );
  } catch (error) {
    return "AI insight generation unavailable";
  }
};

module.exports = {
  chat,
  chatStream,
  prompt,
};
