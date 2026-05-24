const { prompt: aiPrompt } = require("./openaiService");

const SUPPLIER_SYSTEM = `You are a procurement and supply chain risk analyst.
Analyze supplier data and provide actionable business insights.
Use markdown formatting. Be specific with numbers and percentages.
Categories: Financial Health, Stock Risk, Relationship Score, Recommendations.`;

exports.analyseSupplier = async (supplier) => {
  const stats = supplier.stats || {};
  const userContent = `
Analyze this supplier:
- Name: ${supplier.name}
- Company: ${supplier.company || "N/A"}
- Active: ${supplier.active}
- Products in stock: ${stats.qty || 0} units
- Stock value: ₹${(stats.value || 0).toLocaleString("en-IN")}
- Cost value: ₹${(stats.costValue || 0).toLocaleString("en-IN")}
- Profit generated: ₹${(stats.profit || 0).toLocaleString("en-IN")}
- Low stock items: ${stats.lowStock || 0}

Provide: Risk Score (0-100), Financial health, Recommendations.`;

  return aiPrompt(SUPPLIER_SYSTEM, userContent, { temperature: 0.5 });
};

exports.bulkSupplierRisk = async (suppliers) => {
  const summary = suppliers.slice(0, 10).map((s) => ({
    name: s.name,
    active: s.active,
    qty: s.stats?.qty || 0,
    profit: s.stats?.profit || 0,
    lowStock: s.stats?.lowStock || 0,
  }));

  const userContent = `
Analyze these ${suppliers.length} suppliers and provide an overall procurement health report:
${JSON.stringify(summary, null, 2)}

Provide:
1. Overall health score
2. Top 3 risks
3. Top performing suppliers
4. Immediate action items`;

  return aiPrompt(SUPPLIER_SYSTEM, userContent, { temperature: 0.5 });
};
