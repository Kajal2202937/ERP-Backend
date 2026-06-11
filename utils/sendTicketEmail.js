const nodemailer = require("nodemailer");

let _transporter = null;

const getTransporter = async () => {
  if (_transporter) return _transporter;

  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    await transport.verify();
    console.log("✅ Email server connected");
    _transporter = transport;
  } catch (err) {
    console.error("❌ Email server connection failed:", err.message);
    _transporter = transport;
  }

  return _transporter;
};

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    const mail = await getTransporter();
    const info = await mail.sendMail({
      from:
        process.env.EMAIL_FROM || `"ERP System" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text: html
        .replace(/<[^>]*>/g, "")
        .replace(/\s+/g, " ")
        .trim(),
      attachments,
    });
    console.log(`✅ Email sent to ${to} | ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`❌ Email send failed to ${to}:`, err.message);
    throw err;
  }
};

const emailWrapper = (content) => `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
    <div style="background:#4F46E5;padding:24px 32px">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600">ERP Support</h1>
    </div>
    <div style="padding:32px">
      ${content}
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb">
      <p style="color:#9ca3af;font-size:12px;margin:0">
        This is an automated message from ERP Support. Please do not reply directly to this email.
      </p>
    </div>
  </div>
`;

const ticketBadge = (ticketId) =>
  `<span style="display:inline-block;background:#EEF2FF;color:#4F46E5;padding:4px 10px;border-radius:4px;font-size:13px;font-weight:600;font-family:monospace">${ticketId}</span>`;

const sendTicketCreatedEmail = async (ticket) => {
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px">We received your request</h2>
    <p style="color:#6b7280;margin:0 0 24px">
      Hi <strong>${ticket.name}</strong>, your support ticket has been created successfully.
      Our team will review it and respond as soon as possible.
    </p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:20px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0;width:120px">Ticket ID</td>
          <td style="padding:4px 0">${ticketBadge(ticket.ticketId)}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0">Subject</td>
          <td style="color:#111827;font-size:14px;padding:4px 0">${ticket.subject || "General Inquiry"}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0">Status</td>
          <td style="color:#111827;font-size:14px;padding:4px 0;text-transform:capitalize">New</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0">Submitted</td>
          <td style="color:#111827;font-size:14px;padding:4px 0">${new Date(ticket.createdAt).toLocaleString()}</td>
        </tr>
      </table>
    </div>
    <p style="color:#6b7280;font-size:14px">
      You can reply to this ticket at any time using your ticket ID. Keep it safe for future reference.
    </p>
  `);
  return sendEmail({
    to: ticket.email,
    subject: `Support Ticket Created: ${ticket.ticketId}`,
    html,
  });
};

const sendAdminReplyEmail = async (ticket, replyMessage) => {
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px">You have a new reply</h2>
    <p style="color:#6b7280;margin:0 0 24px">
      Hi <strong>${ticket.name}</strong>, our support team has responded to your ticket
      ${ticketBadge(ticket.ticketId)}.
    </p>
    <div style="border-left:4px solid #4F46E5;padding:16px 20px;background:#f9fafb;border-radius:0 6px 6px 0;margin-bottom:24px">
      <p style="color:#374151;margin:0;font-size:15px;line-height:1.6">${replyMessage}</p>
    </div>
    <p style="color:#6b7280;font-size:14px">
      To continue the conversation, visit the support portal and reference your ticket ID:
      ${ticketBadge(ticket.ticketId)}
    </p>
  `);
  return sendEmail({
    to: ticket.email,
    subject: `Re: ${ticket.subject || "Your Support Request"} [${ticket.ticketId}]`,
    html,
  });
};

const sendTicketResolvedEmail = async (ticket) => {
  const html = emailWrapper(`
    <h2 style="color:#111827;margin:0 0 8px">Your ticket has been resolved</h2>
    <p style="color:#6b7280;margin:0 0 24px">
      Hi <strong>${ticket.name}</strong>, we're happy to let you know that your support
      ticket has been marked as resolved.
    </p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:20px;margin-bottom:24px">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0;width:120px">Ticket ID</td>
          <td style="padding:4px 0">${ticketBadge(ticket.ticketId)}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0">Subject</td>
          <td style="color:#111827;font-size:14px;padding:4px 0">${ticket.subject || "General Inquiry"}</td>
        </tr>
        <tr>
          <td style="color:#6b7280;font-size:13px;padding:4px 0">Resolved At</td>
          <td style="color:#111827;font-size:14px;padding:4px 0">
            ${ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString() : new Date().toLocaleString()}
          </td>
        </tr>
      </table>
    </div>
    <p style="color:#6b7280;font-size:14px">
      If you feel your issue was not fully resolved or you have further questions,
      please submit a new ticket or reply to reopen this one.
    </p>
  `);
  return sendEmail({
    to: ticket.email,
    subject: `Ticket Resolved: ${ticket.ticketId}`,
    html,
  });
};

module.exports = {
  sendEmail,
  sendTicketCreatedEmail,
  sendAdminReplyEmail,
  sendTicketResolvedEmail,
};
