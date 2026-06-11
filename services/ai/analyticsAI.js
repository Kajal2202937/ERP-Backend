const {
  prompt: analyticsPrompt,
  chat: aiChat,
  sanitizeMessages,
  AI_LIMITS,
} = require("./openaiService");

const ANALYTICS_SYSTEM = `You are an expert ERP business analyst and financial advisor.
Analyze business data and provide deep, actionable insights.
Use markdown with headers, bullet points, and concrete recommendations.
Always include specific numbers, trends, and next steps.`;

const ERP_ASSISTANT_SYSTEM = `You are an intelligent ERP assistant for a manufacturing/retail business.
You help with: inventory management, order analysis, supplier evaluation, financial insights, production planning.
Be concise, professional, and data-driven. Use markdown formatting.
If asked about something outside ERP/business, politely redirect.`;

exports.generateBusinessInsights = async (data) => {
  const { summary = {}, topProducts = [], trend = [] } = data;

  const userContent = `
Generate comprehensive business insights from this ERP data:

Sales Summary:
- Total Orders: ${summary.totalOrders || 0}
- Total Revenue: Rs. ${(summary.totalRevenue || 0).toLocaleString("en-IN")}
- Total Profit: Rs. ${(summary.profit || 0).toLocaleString("en-IN")}
- Profit Margin: ${summary.profitMargin || 0}%

Top Products: ${topProducts
    .slice(0, 5)
    .map((p) => `${p.name} (${p.totalSold} sold)`)
    .join(", ")}

Recent Trend: ${trend
    .slice(-7)
    .map((t) => `${t.date}: Rs. ${t.total}`)
    .join(" | ")}

Provide: Performance analysis, Growth opportunities, Risk factors, 30-day action plan.`;

  const result = await analyticsPrompt(ANALYTICS_SYSTEM, userContent, {
    temperature: 0.6,
  });

  const ERROR_RESPONSES = new Set([
    "AI quota exceeded",
    "AI service unavailable",
    "Invalid OpenAI API key",
    "AI service not configured",
    "AI request invalid",
  ]);

  if (ERROR_RESPONSES.has(result)) {
    return [
      `Revenue: Rs. ${(summary.totalRevenue || 0).toLocaleString("en-IN")}`,
      `Orders: ${summary.totalOrders || 0}`,
      `Profit Margin: ${summary.profitMargin || 0}%`,
      "AI insights temporarily unavailable",
    ];
  }

  return result;
};

/**
 * @param {Array}  history - Array of { role, content } from client
 * @param {Object} context - ERP stats snapshot (totalOrders, totalRevenue, etc.)
 */
exports.erpAssistantChat = async (history, context = {}) => {
  const safeContext = {
    totalOrders: Number(context.totalOrders) || 0,
    totalRevenue: Number(context.totalRevenue) || 0,
    activeSuppliers: Number(context.activeSuppliers) || 0,
    lowStock: Number(context.lowStock) || 0,
  };

  const systemMsg = {
    role: "system",
    content: `${ERP_ASSISTANT_SYSTEM}

Current ERP Context:
- Total Orders: ${safeContext.totalOrders}
- Revenue: Rs. ${safeContext.totalRevenue.toLocaleString("en-IN")}
- Active Suppliers: ${safeContext.activeSuppliers}
- Low Stock Items: ${safeContext.lowStock}
Today: ${new Date().toLocaleDateString("en-IN")}`,
  };

  const messages = sanitizeMessages(
    [systemMsg, ...history],
    AI_LIMITS.MAX_MESSAGES,
  );

  return aiChat(messages, {
    temperature: 0.7,
    max_tokens: AI_LIMITS.MAX_CHAT_TOKENS,
  });
};
