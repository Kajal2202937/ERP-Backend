const mongoose = require("mongoose");
const Ticket = require("../models/Ticket");
const generateTicketId = require("../utils/generateTicketId");

const createTicket = async ({ name, email, subject, message }) => {
  if (!name?.trim()) throw new Error("Name is required");
  if (!email?.trim()) throw new Error("Email is required");
  if (!message?.trim()) throw new Error("Message is required");

  const ticketId = await generateTicketId();

  const ticket = await Ticket.create({
    ticketId,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    subject: subject?.trim() || "General Inquiry",
    status: "new",
    messages: [
      {
        message: message.trim(),
        sender: "user",
        seen: false,
      },
    ],
    lastMessageAt: new Date(),
  });

  return ticket;
};

const getAllTickets = async ({
  status,
  priority,
  search,
  page = 1,
  limit = 30,
} = {}) => {
  const query = {};

  if (status && status !== "all") {
    query.status = status;
  }

  if (priority) {
    query.priority = priority;
  }

  if (search?.trim()) {
    const regex = new RegExp(search.trim(), "i");
    query.$or = [
      { name: regex },
      { email: regex },
      { ticketId: regex },
      { subject: regex },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [tickets, total] = await Promise.all([
    Ticket.find(query)
      .populate("assignedTo", "name email")
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean({ virtuals: true }),
    Ticket.countDocuments(query),
  ]);

  return {
    tickets,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  };
};

const getTicketById = async (id) => {
  const ticket = await Ticket.findById(id)
    .populate("assignedTo", "name email")
    .lean({ virtuals: true });

  if (!ticket) throw new Error("Ticket not found");
  return ticket;
};

const getTicketByTicketId = async (ticketId) => {
  const ticket = await Ticket.findOne({ ticketId })
    .populate("assignedTo", "name email")
    .lean({ virtuals: true });

  if (!ticket) throw new Error("Ticket not found");
  return ticket;
};

const addMessage = async (id, message, sender) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new Error("Invalid ticket ID");
  if (!message?.trim()) throw new Error("Message is required");
  if (!["admin", "user"].includes(sender)) throw new Error("Invalid sender");

  const ticket = await Ticket.findById(id);
  if (!ticket) throw new Error("Ticket not found");

  ticket.messages.push({
    message: message.trim(),
    sender,
    seen: false,
  });

  if (sender === "admin") {
    if (["new", "open"].includes(ticket.status)) {
      ticket.status = "in_progress";
    }
  } else {
    if (["waiting_for_user", "in_progress"].includes(ticket.status)) {
      ticket.status = "open";
    }
  }

  ticket.lastMessageAt = new Date();

  await ticket.save();
  return ticket;
};

const updateTicketStatus = async (id, status) => {
  const validStatuses = [
    "new",
    "open",
    "in_progress",
    "waiting_for_user",
    "resolved",
    "closed",
  ];
  if (!validStatuses.includes(status)) throw new Error("Invalid status");

  const update = { status };
  if (status === "resolved") {
    update.resolvedAt = new Date();
  }

  const ticket = await Ticket.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
  });

  if (!ticket) throw new Error("Ticket not found");
  return ticket;
};

const updateTicketPriority = async (id, priority) => {
  const ticket = await Ticket.findByIdAndUpdate(
    id,
    { priority },
    { new: true, runValidators: true },
  );
  if (!ticket) throw new Error("Ticket not found");
  return ticket;
};

const resolveTicket = async (id) => {
  const ticket = await Ticket.findByIdAndUpdate(
    id,
    { status: "resolved", resolvedAt: new Date() },
    { new: true },
  );
  if (!ticket) throw new Error("Ticket not found");
  return ticket;
};

const markMessagesSeen = async (ticketId, viewer) => {
  const senderToMark = viewer === "admin" ? "user" : "admin";

  await Ticket.updateOne(
    { _id: ticketId },
    {
      $set: {
        "messages.$[msg].seen": true,
        ...(viewer === "admin" ? { readByAdmin: true } : {}),
      },
    },
    {
      arrayFilters: [{ "msg.sender": senderToMark, "msg.seen": false }],
    },
  );
};

const deleteTicket = async (id) => {
  const ticket = await Ticket.findByIdAndDelete(id);
  if (!ticket) throw new Error("Ticket not found");
  return true;
};

const getTicketStats = async () => {
  const stats = await Ticket.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);

  const unreadCount = await Ticket.countDocuments({
    readByAdmin: false,
    status: { $nin: ["resolved", "closed"] },
  });

  const result = {
    total: 0,
    new: 0,
    open: 0,
    in_progress: 0,
    waiting_for_user: 0,
    resolved: 0,
    closed: 0,
    unread: unreadCount,
  };

  stats.forEach(({ _id, count }) => {
    if (_id in result) result[_id] = count;
    result.total += count;
  });

  return result;
};

module.exports = {
  createTicket,
  getAllTickets,
  getTicketById,
  getTicketByTicketId,
  addMessage,
  updateTicketStatus,
  updateTicketPriority,
  resolveTicket,
  markMessagesSeen,
  deleteTicket,
  getTicketStats,
};
