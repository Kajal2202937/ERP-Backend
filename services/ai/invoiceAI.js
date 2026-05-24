const { prompt } = require("./openaiService");

const INVOICE_SYSTEM = `You are a professional ERP invoice analyst.
Analyze invoice data and provide clear, concise business insights.
Always respond in structured markdown with headers, bullet points and numbers.
Focus on: totals, margins, anomalies, payment recommendations.`;

exports.summariseInvoice = async (invoice) => {
  const userContent = `
Summarize this invoice/order:
- Product: ${invoice.product?.name || "Unknown"}
- Supplier: ${invoice.product?.supplier?.name || "N/A"}
- Quantity: ${invoice.quantity}
- Unit Price: ₹${invoice.price}
- Cost Price: ₹${invoice.costPrice}
- Total: ₹${invoice.totalPrice}
- Status: ${invoice.status}
- Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}

Provide: profit margin, risk assessment, payment recommendation.`;

  return prompt(INVOICE_SYSTEM, userContent, { temperature: 0.4 });
};

exports.generateInvoiceEmail = async (invoice, recipientName = "Customer") => {
  const userContent = `
Generate a professional business email for this invoice:
- Recipient: ${recipientName}
- Product: ${invoice.product?.name}
- Total Amount: ₹${invoice.totalPrice}
- Order ID: ${invoice._id}
- Status: ${invoice.status}
- Date: ${new Date(invoice.createdAt).toLocaleDateString("en-IN")}

Write a polished, professional email with subject line included.`;

  return prompt(INVOICE_SYSTEM, userContent, { temperature: 0.6 });
};
