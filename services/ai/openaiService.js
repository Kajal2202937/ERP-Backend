const OpenAI = require("openai");
const AppError = require("../../utils/AppError");

const AI_LIMITS = {
  MAX_MESSAGES: 20,
  MAX_MSG_CHARS: 2000,
  MAX_SYSTEM_CHARS: 3000,
  MAX_TOKENS: 1500,
  MAX_CHAT_TOKENS: 800,
};

let client = null;

// Track quota exhaustion so we stop hammering the API on every poll cycle
let _quotaExhausted = false;
let _quotaResetAt = null; // retry after this timestamp

const isQuotaExhausted = () => {
  if (!_quotaExhausted) return false;
  // Auto-clear after 10 minutes so a billing fix is picked up eventually
  if (_quotaResetAt && Date.now() > _quotaResetAt) {
    _quotaExhausted = false;
    _quotaResetAt = null;
    return false;
  }
  return true;
};

const getClient = () => {
  if (client) return client;
  if (!process.env.OPENAI_API_KEY) return null;
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
};

const handleOpenAIError = (error) => {
  console.error("OPENAI ERROR:", error?.status, error?.message);
  if (error?.status === 429 || error?.code === "insufficient_quota") {
    // Back off: do not retry for 10 minutes
    _quotaExhausted = true;
    _quotaResetAt = Date.now() + 10 * 60 * 1000;
    return "AI quota exceeded";
  }
  if (error?.status === 401) return "Invalid OpenAI API key";
  if (error?.status === 400) return "AI request invalid";
  return "AI service unavailable";
};

const truncateContent = (content, maxChars = AI_LIMITS.MAX_MSG_CHARS) => {
  const str = String(content ?? "");
  if (str.length <= maxChars) return str;
  return str.slice(0, maxChars) + `... [truncated to ${maxChars} chars]`;
};

const sanitizeMessages = (messages, maxMessages = AI_LIMITS.MAX_MESSAGES) => {
  if (!Array.isArray(messages)) return [];

  const system = messages.filter((m) => m.role === "system");
  const convo = messages.filter((m) => m.role !== "system");
  const trimmed = convo.slice(-maxMessages);

  return [...system, ...trimmed]
    .filter((m) => ["system", "user", "assistant"].includes(m.role))
    .map((m) => ({
      role: m.role,
      content: truncateContent(
        m.content,
        m.role === "system"
          ? AI_LIMITS.MAX_SYSTEM_CHARS
          : AI_LIMITS.MAX_MSG_CHARS,
      ),
    }))
    .filter((m) => m.content.length > 0);
};

const chat = async (messages, opts = {}) => {
  try {
    if (isQuotaExhausted())
      return "AI quota exceeded — please check your OpenAI billing.";

    const ai = getClient();
    if (!ai) return "AI service not configured";

    const safe = sanitizeMessages(
      messages,
      opts.maxMessages || AI_LIMITS.MAX_MESSAGES,
    );
    if (!safe.length) return "No valid messages to process";

    const response = await ai.chat.completions.create({
      model: opts.model || "gpt-4o-mini",
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens || AI_LIMITS.MAX_TOKENS,
      messages: safe,
    });

    return response?.choices?.[0]?.message?.content?.trim() || "";
  } catch (error) {
    return handleOpenAIError(error);
  }
};

const chatStream = async (messages, opts = {}) => {
  if (isQuotaExhausted())
    throw new AppError(
      "AI quota exceeded — please check your OpenAI billing.",
      503,
    );

  const ai = getClient();
  if (!ai) throw new AppError("AI service not configured", 503);

  const safe = sanitizeMessages(
    messages,
    opts.maxMessages || AI_LIMITS.MAX_MESSAGES,
  );
  if (!safe.length) throw new AppError("No valid messages to process", 400);

  try {
    return await ai.chat.completions.create({
      model: opts.model || "gpt-4o-mini",
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.max_tokens || AI_LIMITS.MAX_TOKENS,
      stream: true,
      messages: safe,
    });
  } catch (error) {
    throw new AppError(handleOpenAIError(error), 502);
  }
};

const prompt = async (systemPrompt, userContent, opts = {}) => {
  try {
    if (isQuotaExhausted())
      return "AI insight generation unavailable — quota exceeded.";
    return await chat(
      [
        {
          role: "system",
          content: truncateContent(systemPrompt, AI_LIMITS.MAX_SYSTEM_CHARS),
        },
        {
          role: "user",
          content: truncateContent(userContent, AI_LIMITS.MAX_MSG_CHARS),
        },
      ],
      opts,
    );
  } catch {
    return "AI insight generation unavailable";
  }
};

module.exports = { chat, chatStream, prompt, sanitizeMessages, AI_LIMITS };
