const { sendEmail } = require("./sendTicketEmail");
const {
  generateInvoicePdfBuffer,
} = require("../services/pdf/invoicePdfBuffer");

const orderEmailWrapper = (content) => `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#4F46E5;padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600">ERP Orders</h1>
    </div>
    <div style="padding:32px">
      ${content}
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0">
        This is an automated message from ERP Orders. Please do not reply directly to this email.
      </p>
    </div>
  </div>
`;

const orderBadge = (ref) =>
  `<span style="display:inline-block;background:#EEF2FF;color:#4F46E5;padding:4px 10px;border-radius:4px;font-size:13px;font-weight:600;font-family:monospace">${ref}</span>`;

const statusBadge = (status) => {
  const map = {
    pending: { bg: "#FEF9C3", fg: "#854D0E" },
    completed: { bg: "#DCFCE7", fg: "#166534" },
    cancelled: { bg: "#FEE2E2", fg: "#991B1B" },
  };
  const c = map[status] || map.pending;
  return `<span style="display:inline-block;background:${c.bg};color:${c.fg};padding:3px 10px;border-radius:4px;font-size:12px;font-weight:600;text-transform:capitalize">${status}</span>`;
};

const ref = (order) =>
  order.orderNumber || order._id.toString().slice(-8).toUpperCase();

const safePdfBuffer = async (order) => {
  try {
    return await generateInvoicePdfBuffer(order);
  } catch (err) {
    console.error("[OrderEmail] PDF generation failed:", err.message);
    return null;
  }
};

/**
 * Sent to customer immediately after order is placed.
 * Attaches PDF invoice if customer email is provided.
 *
 * @param {Object} order - fully populated order document
 */
const sendOrderConfirmationEmail = async (order) => {
  const to = order.customer?.email;
  if (!to || !to.includes("@")) return;

  const customerName = order.customer?.name || "Valued Customer";
  const invoiceRef = ref(order);

  const html = orderEmailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px">Order Confirmed ✓</h2>
    <p style="color:#6b7280;margin:0 0 24px">
      Hi <strong>${customerName}</strong>, your order has been received and is being processed.
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0;width:140px">Order Number</td>
          <td style="padding:6px 0">${orderBadge(invoiceRef)}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0">Product</td>
          <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0">
            ${order.product?.name || "Product"}
          </td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0">Quantity</td>
          <td style="color:#111827;font-size:14px;padding:6px 0">${order.quantity} units</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0">Total Amount</td>
          <td style="color:#111827;font-size:16px;font-weight:700;padding:6px 0">
            ₹${Number(order.totalPrice).toLocaleString("en-IN")}
          </td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0">Status</td>
          <td style="padding:6px 0">${statusBadge(order.status)}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0">Order Date</td>
          <td style="color:#111827;font-size:14px;padding:6px 0">
            ${new Date(order.createdAt).toLocaleString("en-IN")}
          </td>
        </tr>
        ${
          order.customer?.phone
            ? `
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0">Phone</td>
          <td style="color:#111827;font-size:14px;padding:6px 0">${order.customer.phone}</td>
        </tr>`
            : ""
        }
      </table>
    </div>

    ${
      order.notes
        ? `
    <div style="border-left:3px solid #e5e7eb;padding:10px 16px;margin-bottom:20px;background:#fafafa;border-radius:0 4px 4px 0">
      <p style="color:#6b7280;font-size:12px;margin:0 0 4px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Order Notes</p>
      <p style="color:#374151;font-size:14px;margin:0">${order.notes}</p>
    </div>`
        : ""
    }

    <p style="color:#6b7280;font-size:13px;margin:0">
      Please keep your order number ${orderBadge(invoiceRef)} safe for tracking and support queries.
      A detailed invoice is attached to this email.
    </p>
  `);

  const pdfBuffer = await safePdfBuffer(order);
  const attachments = pdfBuffer
    ? [
        {
          filename: `Invoice-${invoiceRef}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ]
    : [];

  return sendEmail({
    to,
    subject: `Order Confirmed: ${invoiceRef} — ₹${Number(order.totalPrice).toLocaleString("en-IN")}`,
    html,
    attachments,
  });
};

/**
 * Sent to customer when status changes (pending→completed, pending→cancelled).
 *
 * @param {Object} order     - updated order document
 * @param {string} oldStatus - previous status
 */
const sendOrderStatusEmail = async (order, oldStatus) => {
  const to = order.customer?.email;
  if (!to || !to.includes("@")) return;
  if (!oldStatus || oldStatus === order.status) return;

  const customerName = order.customer?.name || "Valued Customer";
  const invoiceRef = ref(order);

  const msgMap = {
    completed: {
      headline: "Your order has been completed ✓",
      body: "Great news! Your order has been processed and completed successfully.",
      borderColor: "#16a34a",
    },
    cancelled: {
      headline: "Your order has been cancelled",
      body: "Your order has been cancelled. If you did not request this or have questions, please contact our support team.",
      borderColor: "#dc2626",
    },
    pending: {
      headline: "Your order is pending",
      body: "Your order has been placed back into pending status. Our team will process it shortly.",
      borderColor: "#d97706",
    },
  };

  const msg = msgMap[order.status] || {
    headline: `Order status updated to ${order.status}`,
    body: "Your order status has been updated.",
    borderColor: "#4F46E5",
  };

  const html = orderEmailWrapper(`
    <h2 style="color:${msg.borderColor};margin:0 0 8px">${msg.headline}</h2>
    <p style="color:#6b7280;margin:0 0 24px">
      Hi <strong>${customerName}</strong>, ${msg.body}
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0;width:140px">Order Number</td>
          <td style="padding:6px 0">${orderBadge(invoiceRef)}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0">Product</td>
          <td style="color:#111827;font-size:14px;font-weight:600;padding:6px 0">
            ${order.product?.name || "Product"}
          </td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0">Previous Status</td>
          <td style="padding:6px 0">${statusBadge(oldStatus)}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0">Current Status</td>
          <td style="padding:6px 0">${statusBadge(order.status)}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0">Updated At</td>
          <td style="color:#111827;font-size:14px;padding:6px 0">
            ${new Date().toLocaleString("en-IN")}
          </td>
        </tr>
      </table>
    </div>

    <p style="color:#6b7280;font-size:13px;margin:0">
      For any queries, contact our support team with order number ${orderBadge(invoiceRef)}.
    </p>
  `);

  return sendEmail({
    to,
    subject: `Order ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}: ${invoiceRef}`,
    html,
  });
};

/**
 * Sends just the PDF invoice to the customer.
 * Triggered manually by admin via "Resend Invoice" button.
 *
 * @param {Object} order - populated order document
 */
const sendOrderInvoiceEmail = async (order) => {
  const to = order.customer?.email;
  if (!to || !to.includes("@")) return;

  const customerName = order.customer?.name || "Valued Customer";
  const invoiceRef = ref(order);

  const html = orderEmailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px">Your Invoice is Ready</h2>
    <p style="color:#6b7280;margin:0 0 24px">
      Hi <strong>${customerName}</strong>, please find your invoice for order
      ${orderBadge(invoiceRef)} attached to this email.
    </p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0;width:140px">Invoice No.</td>
          <td style="padding:6px 0">${orderBadge(invoiceRef)}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0">Amount</td>
          <td style="color:#111827;font-size:16px;font-weight:700;padding:6px 0">
            ₹${Number(order.totalPrice).toLocaleString("en-IN")}
          </td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:6px 0">Due Date</td>
          <td style="color:#111827;font-size:14px;padding:6px 0">
            ${new Date(Date.now() + 15 * 864e5).toLocaleDateString("en-IN")}
          </td>
        </tr>
      </table>
    </div>

    <p style="color:#6b7280;font-size:13px;margin:0">
      Payment is due within 15 days. Please include the invoice number as payment reference.
    </p>
  `);

  const pdfBuffer = await safePdfBuffer(order);
  const attachments = pdfBuffer
    ? [
        {
          filename: `Invoice-${invoiceRef}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ]
    : [];

  return sendEmail({
    to,
    subject: `Invoice: ${invoiceRef} — ₹${Number(order.totalPrice).toLocaleString("en-IN")}`,
    html,
    attachments,
  });
};

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendOrderInvoiceEmail,
};
