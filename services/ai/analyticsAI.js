const { prompt: analyticsPrompt } = require("./openaiService");
const { chat: aiChat } = require("./openaiService");

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
- Total Revenue: ₹${(summary.totalRevenue || 0).toLocaleString("en-IN")}
- Total Profit: ₹${(summary.profit || 0).toLocaleString("en-IN")}
- Profit Margin: ${summary.profitMargin || 0}%

Top Products: ${topProducts
    .slice(0, 5)
    .map((p) => `${p.name} (${p.totalSold} sold)`)
    .join(", ")}

Recent Trend: ${trend
    .slice(-7)
    .map((t) => `${t.date}: ₹${t.total}`)
    .join(" | ")}

Provide: Performance analysis, Growth opportunities, Risk factors, 30-day action plan.`;

  const result = await analyticsPrompt(ANALYTICS_SYSTEM, userContent, {
    temperature: 0.6,
  });

  if (
    result === "AI quota exceeded" ||
    result === "AI service unavailable" ||
    result === "Invalid OpenAI API key" ||
    result === "AI service not configured"
  ) {
    return [
      `Revenue: ₹${(summary.totalRevenue || 0).toLocaleString("en-IN")}`,
      `Orders: ${summary.totalOrders || 0}`,
      `Profit Margin: ${summary.profitMargin || 0}%`,
      "AI insights temporarily unavailable",
    ];
  }

  return result;
};

/**
 * Multi-turn ERP assistant chat.
 * @param {Array} history - Array of { role, content } messages
 */
exports.erpAssistantChat = async (history, context = {}) => {
  const systemMsg = {
    role: "system",
    content: `${ERP_ASSISTANT_SYSTEM}
    
Current ERP Context:
- Total Orders: ${context.totalOrders || "N/A"}
- Revenue: ₹${context.totalRevenue || "N/A"}
- Active Suppliers: ${context.activeSuppliers || "N/A"}
- Low Stock Items: ${context.lowStock || "N/A"}
Today: ${new Date().toLocaleDateString("en-IN")}`,
  };

  const messages = [systemMsg, ...history];
  return aiChat(messages, { temperature: 0.7, max_tokens: 800 });
};