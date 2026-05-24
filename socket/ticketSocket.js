const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { TICKET_EVENTS } = require("../utils/socketEvents");

let _io = null;

const initSocket = (server) => {
  if (_io) {
    console.warn("⚠️  Socket.IO already initialized — skipping.");
    return _io;
  }

  const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
    : ["http://localhost:5173"];

  _io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
    pingTimeout: 30000,
    pingInterval: 10000,
    path: "/socket.io",
  });

  _io.use((socket, next) => {
    const token = socket.handshake.auth?.token || null;

    if (!token) {
      socket.user = null;
      return next();
    }

    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      socket.user = null;
      next();
    }
  });

  _io.on("connection", (socket) => {
    const userId = socket.user?.id || "guest";
    console.log(`⚡ Socket connected: ${socket.id} | user: ${userId}`);

    socket.on(TICKET_EVENTS.JOIN_ADMIN, () => {
      if (socket.user?.role !== "admin") {
        socket.emit(TICKET_EVENTS.ERROR, { message: "Unauthorized" });
        return;
      }

      if (!socket.rooms.has("admin_room")) {
        socket.join("admin_room");
        console.log(`🔑 Admin ${socket.id} joined admin_room`);
      }
    });

    socket.on(TICKET_EVENTS.JOIN_TICKET, ({ ticketId }) => {
      if (!ticketId) return;

      const room = `ticket_${ticketId}`;

      if (!socket.rooms.has(room)) {
        socket.join(room);
        console.log(`📂 Socket ${socket.id} joined ${room}`);
      }
    });

    socket.on(TICKET_EVENTS.LEAVE_TICKET, ({ ticketId }) => {
      if (!ticketId) return;
      socket.leave(`ticket_${ticketId}`);
    });

    socket.on(TICKET_EVENTS.TYPING, ({ ticketId }) => {
      if (!ticketId) return;
      socket.to(`ticket_${ticketId}`).emit(TICKET_EVENTS.TYPING, { ticketId });
    });

    socket.on(TICKET_EVENTS.STOP_TYPING, ({ ticketId }) => {
      if (!ticketId) return;
      socket
        .to(`ticket_${ticketId}`)
        .emit(TICKET_EVENTS.STOP_TYPING, { ticketId });
    });

    socket.on(TICKET_EVENTS.SEEN, ({ ticketId }) => {
      if (!ticketId) return;
      socket.to(`ticket_${ticketId}`).emit(TICKET_EVENTS.SEEN, { ticketId });
    });

    socket.on("disconnect", (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id} | reason: ${reason}`);
    });
  });

  console.log("✅ Socket.IO initialized");
  return _io;
};

const getIO = () => {
  if (!_io)
    throw new Error(
      "Socket.IO not initialized. Call initSocket(server) first.",
    );
  return _io;
};

module.exports = { initSocket, getIO };
