const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const { TICKET_EVENTS, ORDER_EVENTS } = require("../utils/socketEvents");
const AppError = require("../utils/AppError");

let _io = null;

const log = {
  info: (msg, meta = {}) =>
    console.log(
      JSON.stringify({
        level: "info",
        msg,
        ...meta,
        ts: new Date().toISOString(),
      }),
    ),
  warn: (msg, meta = {}) =>
    console.warn(
      JSON.stringify({
        level: "warn",
        msg,
        ...meta,
        ts: new Date().toISOString(),
      }),
    ),
  error: (msg, meta = {}) =>
    console.error(
      JSON.stringify({
        level: "error",
        msg,
        ...meta,
        ts: new Date().toISOString(),
      }),
    ),
};

const extractToken = (socket) => {
  const rawCookie = socket.handshake.headers?.cookie;
  if (rawCookie) {
    const parsed = cookie.parse(rawCookie);
    if (parsed.token) return parsed.token;
  }
  return socket.handshake.auth?.token || null;
};

const initSocket = (server) => {
  if (_io) {
    log.warn("socket.already-initialized");
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
    const token = extractToken(socket);

    if (!token) {
      socket.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      log.warn("socket.auth-rejected", {
        reason:
          err.name === "TokenExpiredError" ? "token-expired" : "invalid-token",
        socketId: socket.id,
        ip: socket.handshake.address,
      });

      const message =
        err.name === "TokenExpiredError"
          ? "Session expired. Please log in again."
          : "Invalid token. Authentication failed.";
      return next(new Error(message));
    }
  });

  _io.on("connection", (socket) => {
    if (socket.user) {
      log.info("socket.connected", {
        socketId: socket.id,
        userId: socket.user.id,
        role: socket.user.role,
      });
    } else {
      log.info("socket.connected.guest", { socketId: socket.id });
    }

    const requireUser = (eventName) => {
      if (!socket.user) {
        socket.emit(TICKET_EVENTS.ERROR, {
          message: "Authentication required",
        });
        log.warn("socket.unauthorized-event", {
          event: eventName,
          socketId: socket.id,
        });
        return false;
      }
      return true;
    };

    socket.on(TICKET_EVENTS.JOIN_ADMIN, () => {
      if (!requireUser(TICKET_EVENTS.JOIN_ADMIN)) return;
      if (socket.user.role !== "admin") {
        socket.emit(TICKET_EVENTS.ERROR, { message: "Unauthorized" });
        log.warn("socket.unauthorized-join", {
          event: TICKET_EVENTS.JOIN_ADMIN,
          userId: socket.user.id,
          role: socket.user.role,
        });
        return;
      }
      if (!socket.rooms.has("admin_room")) {
        socket.join("admin_room");
        log.info("socket.room-joined", {
          room: "admin_room",
          userId: socket.user.id,
        });
      }
    });

    socket.on(ORDER_EVENTS.JOIN_MANAGER, () => {
      if (!requireUser(ORDER_EVENTS.JOIN_MANAGER)) return;
      if (!["admin", "manager"].includes(socket.user.role)) {
        socket.emit(TICKET_EVENTS.ERROR, { message: "Unauthorized" });
        log.warn("socket.unauthorized-join", {
          event: ORDER_EVENTS.JOIN_MANAGER,
          userId: socket.user.id,
          role: socket.user.role,
        });
        return;
      }
      if (!socket.rooms.has("manager_room")) {
        socket.join("manager_room");
        log.info("socket.room-joined", {
          room: "manager_room",
          userId: socket.user.id,
        });
      }
      if (socket.user.role === "admin" && !socket.rooms.has("admin_room")) {
        socket.join("admin_room");
      }
    });

    socket.on(TICKET_EVENTS.JOIN_TICKET, ({ ticketId }) => {
      if (!ticketId) return;
      const room = `ticket_${ticketId}`;
      if (!socket.rooms.has(room)) {
        socket.join(room);
        log.info("socket.room-joined", {
          room,
          userId: socket.user?.id || "guest",
        });
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
      log.info("socket.disconnected", {
        socketId: socket.id,
        userId: socket.user?.id || "guest",
        reason,
      });
    });
  });

  log.info("socket.initialized", { origins: allowedOrigins });
  return _io;
};

const getIO = () => {
  if (!_io)
    throw new AppError(
      "Socket.IO not initialized. Call initSocket(server) first.",
    );
  return _io;
};

const emitOrderCreated = (order) => {
  try {
    getIO()
      .to("manager_room")
      .emit(ORDER_EVENTS.ORDER_CREATED, {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          product: { _id: order.product?._id, name: order.product?.name },
          quantity: order.quantity,
          totalPrice: order.totalPrice,
          status: order.status,
          createdBy: { _id: order.createdBy?._id, name: order.createdBy?.name },
          createdAt: order.createdAt,
        },
      });
    log.info("socket.emit", {
      event: ORDER_EVENTS.ORDER_CREATED,
      orderNumber: order.orderNumber,
    });
  } catch (err) {
    log.error("socket.emit-failed", {
      event: "ORDER_CREATED",
      error: err.message,
    });
  }
};

const emitOrderUpdated = (order, oldStatus, changedByName) => {
  try {
    getIO()
      .to("manager_room")
      .emit(ORDER_EVENTS.ORDER_UPDATED, {
        orderId: order._id,
        orderNumber: order.orderNumber,
        oldStatus,
        newStatus: order.status,
        changedBy: changedByName || "Unknown",
      });
  } catch (err) {
    log.error("socket.emit-failed", {
      event: "ORDER_UPDATED",
      error: err.message,
    });
  }
};

const emitOrderDeleted = (orderId, orderNumber) => {
  try {
    getIO()
      .to("manager_room")
      .emit(ORDER_EVENTS.ORDER_DELETED, { orderId, orderNumber });
  } catch (err) {
    log.error("socket.emit-failed", {
      event: "ORDER_DELETED",
      error: err.message,
    });
  }
};

module.exports = {
  initSocket,
  getIO,
  emitOrderCreated,
  emitOrderUpdated,
  emitOrderDeleted,
};
