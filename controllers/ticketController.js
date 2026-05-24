const ticketService = require("../services/ticketService");
const { getIO } = require("../socket/ticketSocket");
const { TICKET_EVENTS } = require("../utils/socketEvents");
const {
  sendTicketCreatedEmail,
  sendAdminReplyEmail,
  sendTicketResolvedEmail,
} = require("../utils/sendTicketEmail");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

const safeEmit = (fn) => {
  try {
    fn();
  } catch (err) {
    console.error("⚠️ Socket emit error:", err.message);
  }
};

exports.createTicket = asyncHandler(async (req, res) => {
  const { name, email, subject, message } = req.body;

  const ticket = await ticketService.createTicket({
    name,
    email,
    subject,
    message,
  });

  safeEmit(() => {
    getIO().to("admin_room").emit(TICKET_EVENTS.TICKET_NEW, {
      _id: ticket._id,
      ticketId: ticket.ticketId,
      name: ticket.name,
      email: ticket.email,
      subject: ticket.subject,
      status: ticket.status,
      priority: ticket.priority,
      lastMessageAt: ticket.lastMessageAt,
      createdAt: ticket.createdAt,
    });
  });

  sendTicketCreatedEmail(ticket).catch((err) =>
    console.error("❌ Ticket created email failed:", err.message),
  );

  res.status(201).json({ success: true, data: ticket });
});

exports.getTickets = asyncHandler(async (req, res) => {
  const { status, priority, search, page, limit } = req.query;
  const result = await ticketService.getAllTickets({
    status,
    priority,
    search,
    page,
    limit,
  });
  res.json({ success: true, ...result });
});

exports.getTicketStats = asyncHandler(async (req, res) => {
  const stats = await ticketService.getTicketStats();
  res.json({ success: true, data: stats });
});

exports.getTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.getTicketById(req.params.id);
  res.json({ success: true, data: ticket });
});

exports.replyTicket = asyncHandler(async (req, res) => {
  const { message, tempId } = req.body;
  const contactId = req.params.id;

  const sender = req.user?.role === "admin" ? "admin" : "user";

  if (!message?.trim()) throw new AppError("Message is required", 400);

  const ticket = await ticketService.addMessage(
    contactId,
    message.trim(),
    sender,
  );
  const lastMessage = ticket.messages[ticket.messages.length - 1];

  const replyPayload = {
    _id: lastMessage._id,
    ticketId: ticket.ticketId,
    contactId: ticket._id.toString(),
    message: lastMessage.message,
    sender: lastMessage.sender,
    seen: lastMessage.seen,
    tempId: tempId || null,
    createdAt: lastMessage.createdAt,
  };

  safeEmit(() => {
    getIO()
      .to(`ticket_${ticket.ticketId}`)
      .emit(TICKET_EVENTS.TICKET_REPLY, replyPayload);
  });

  safeEmit(() => {
    getIO()
      .to("admin_room")
      .emit(TICKET_EVENTS.TICKET_UPDATED, {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        status: ticket.status,
        lastMessageAt: ticket.lastMessageAt,
        lastMessage: {
          message: lastMessage.message,
          sender: lastMessage.sender,
          createdAt: lastMessage.createdAt,
        },
      });
  });

  if (sender === "admin") {
    sendAdminReplyEmail(ticket, message.trim()).catch((err) =>
      console.error("❌ Admin reply email failed:", err.message),
    );
  }

  res.json({ success: true, data: replyPayload });
});

exports.updateTicketStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!status) throw new AppError("Status is required", 400);

  const ticket = await ticketService.updateTicketStatus(req.params.id, status);

  safeEmit(() => {
    getIO().to("admin_room").emit(TICKET_EVENTS.TICKET_UPDATED, {
      _id: ticket._id,
      ticketId: ticket.ticketId,
      status: ticket.status,
    });
    getIO().to(`ticket_${ticket.ticketId}`).emit(TICKET_EVENTS.TICKET_UPDATED, {
      _id: ticket._id,
      ticketId: ticket.ticketId,
      status: ticket.status,
    });
  });

  res.json({ success: true, data: ticket });
});

exports.updateTicketPriority = asyncHandler(async (req, res) => {
  const { priority } = req.body;
  if (!priority) throw new AppError("Priority is required", 400);

  const ticket = await ticketService.updateTicketPriority(
    req.params.id,
    priority,
  );
  res.json({ success: true, data: ticket });
});

exports.resolveTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.resolveTicket(req.params.id);

  safeEmit(() => {
    getIO()
      .to(`ticket_${ticket.ticketId}`)
      .emit(TICKET_EVENTS.TICKET_RESOLVED, {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        status: ticket.status,
        resolvedAt: ticket.resolvedAt,
      });
    getIO().to("admin_room").emit(TICKET_EVENTS.TICKET_UPDATED, {
      _id: ticket._id,
      ticketId: ticket.ticketId,
      status: ticket.status,
      resolvedAt: ticket.resolvedAt,
    });
  });

  sendTicketResolvedEmail(ticket).catch((err) =>
    console.error("❌ Ticket resolved email failed:", err.message),
  );

  res.json({ success: true, data: ticket });
});

exports.markSeen = asyncHandler(async (req, res) => {
  const viewer = req.user?.role === "admin" ? "admin" : "user";
  await ticketService.markMessagesSeen(req.params.id, viewer);

  safeEmit(() => {
    getIO()
      .to(`ticket_${req.params.id}`)
      .emit(TICKET_EVENTS.SEEN, { ticketId: req.params.id, viewer });
  });

  res.json({ success: true });
});

exports.deleteTicket = asyncHandler(async (req, res) => {
  const ticket = await ticketService.getTicketById(req.params.id);
  await ticketService.deleteTicket(req.params.id);

  safeEmit(() => {
    getIO().to("admin_room").emit(TICKET_EVENTS.TICKET_DELETED, {
      _id: req.params.id,
      ticketId: ticket.ticketId,
    });
  });

  res.json({ success: true, message: "Ticket deleted successfully" });
});
