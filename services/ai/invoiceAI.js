const { prompt } = require("./openaiService");

const INVOICE_SYSTEM = `You are a professional ERP invoice analyst.
Analyze invoice data and provide clear, concise business insights.
Always respond in structured markdown with headers, bullet points and numbers.
Focus on: totals, margins, anomalies, payment recommendations.`;

exports.summariseInvoice = async (invoice) => {
  const productName = String(invoice.product?.name || "Unknown").slice(0, 100);
  const supplierName = String(invoice.product?.supplier?.name || "N/A").slice(
    0,
    100,
  );
  const quantity = Number(invoice.quantity) || 0;
  const price = Number(invoice.price) || 0;
  const costPrice = Number(invoice.costPrice) || 0;
  const totalPrice = Number(invoice.totalPrice) || 0;
  const status = String(invoice.status || "unknown").slice(0, 20);
  const orderNumber = String(invoice.orderNumber || invoice._id || "N/A").slice(
    0,
    30,
  );

  const totalCost = costPrice * quantity;
  const profit = totalPrice - totalCost;
  const margin =
    totalPrice > 0 ? ((profit / totalPrice) * 100).toFixed(1) : "0.0";

  const userContent = `
Summarize this invoice/order:
- Order No.: ${orderNumber}
- Product: ${productName}
- Supplier: ${supplierName}
- Quantity: ${quantity}
- Unit Price: Rs. ${price.toLocaleString("en-IN")}
- Unit Cost: Rs. ${costPrice.toLocaleString("en-IN")}
- Total Revenue: Rs. ${totalPrice.toLocaleString("en-IN")}
- Total Cost: Rs. ${totalCost.toLocaleString("en-IN")}
- Gross Profit: Rs. ${profit.toLocaleString("en-IN")}
- Margin: ${margin}%
- Status: ${status}
- Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}

Provide: profit assessment, risk factors, payment recommendation.`;

  return prompt(INVOICE_SYSTEM, userContent, { temperature: 0.4 });
};

exports.generateInvoiceEmail = async (invoice, recipientName = "Customer") => {
  const safeName =
    String(recipientName)
      .replace(/[<>{}[\]]/g, "")
      .trim()
      .slice(0, 100) || "Customer";

  const productName = String(invoice.product?.name || "Product").slice(0, 100);
  const totalPrice = Number(invoice.totalPrice) || 0;
  const orderRef = String(invoice.orderNumber || invoice._id || "N/A").slice(
    0,
    30,
  );
  const status = String(invoice.status || "pending").slice(0, 20);

  const userContent = `
Generate a professional business email for this invoice:
- Recipient: ${safeName}
- Product: ${productName}
- Total Amount: Rs. ${totalPrice.toLocaleString("en-IN")}
- Order Reference: ${orderRef}
- Status: ${status}
- Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}

Write a polished, professional email with subject line included.
Keep it concise — no more than 200 words in the body.`;

  return prompt(INVOICE_SYSTEM, userContent, { temperature: 0.6 });
};
