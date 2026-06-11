const { prompt: aiPrompt } = require("./openaiService");

const SUPPLIER_SYSTEM = `You are a procurement and supply chain risk analyst.
Analyze supplier data and provide actionable business insights.
Use markdown formatting. Be specific with numbers and percentages.
Categories: Financial Health, Stock Risk, Relationship Score, Recommendations.`;

exports.analyseSupplier = async (supplier) => {
  const stats = supplier.stats || {};

  const name = String(supplier.name || "Unknown").slice(0, 100);
  const company = String(supplier.company || "N/A").slice(0, 100);
  const isActive = Boolean(supplier.active || supplier.isActive);
  const qty = Number(stats.qty || 0);
  const value = Number(stats.value || 0);
  const costValue = Number(stats.costValue || 0);
  const profit = Number(stats.profit || 0);
  const lowStock = Number(stats.lowStock || 0);

  const userContent = `
Analyze this supplier:
- Name: ${name}
- Company: ${company}
- Active: ${isActive ? "Yes" : "No"}
- Products in stock: ${qty} units
- Stock value: Rs. ${value.toLocaleString("en-IN")}
- Cost value: Rs. ${costValue.toLocaleString("en-IN")}
- Profit generated: Rs. ${profit.toLocaleString("en-IN")}
- Low stock items: ${lowStock}

Provide: Risk Score (0-100), Financial health, Recommendations.`;

  return aiPrompt(SUPPLIER_SYSTEM, userContent, { temperature: 0.5 });
};

const MAX_SUPPLIERS_IN_PROMPT = 10;

exports.bulkSupplierRisk = async (suppliers) => {
  const total = suppliers.length;

  const summary = suppliers.slice(0, MAX_SUPPLIERS_IN_PROMPT).map((s) => ({
    name: String(s.name || "Unknown").slice(0, 60),
    active: Boolean(s.active || s.isActive),
    qty: Number(s.stats?.qty || 0),
    profit: Number(s.stats?.profit || 0),
    lowStock: Number(s.stats?.lowStock || 0),
  }));

  const totalActive = summary.filter((s) => s.active).length;
  const totalLowStock = summary.reduce((acc, s) => acc + s.lowStock, 0);
  const totalProfit = summary.reduce((acc, s) => acc + s.profit, 0);

  const supplierLines = summary
    .map(
      (s, i) =>
        `${i + 1}. ${s.name} | Active: ${s.active ? "Yes" : "No"} | Stock: ${s.qty} units | ` +
        `Profit: Rs. ${s.profit.toLocaleString("en-IN")} | Low stock: ${s.lowStock}`,
    )
    .join("\n");

  const userContent = `
Analyze these suppliers and provide an overall procurement health report.
Total suppliers in system: ${total} (showing top ${summary.length})

Summary:
- Active suppliers: ${totalActive} / ${summary.length}
- Total low stock items: ${totalLowStock}
- Combined profit: Rs. ${totalProfit.toLocaleString("en-IN")}

Supplier breakdown:
${supplierLines}

Provide:
1. Overall health score (0-100)
2. Top 3 procurement risks
3. Top performing suppliers
4. Immediate action items`;

  return aiPrompt(SUPPLIER_SYSTEM, userContent, { temperature: 0.5 });
};
