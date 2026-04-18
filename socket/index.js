const { Server } = require("socket.io");

let io;

const EVENTS = {
  JOIN_CONTACT: "join_contact",
  LEAVE_CONTACT: "leave_contact",

  TYPING: "typing",
  STOP_TYPING: "stop_typing",

  CONTACT_REPLY_RECEIVE: "contact_reply_receive",

  NEW_CONTACT_MESSAGE: "new_contact_message",
  CONTACT_NOTIFICATION: "contact_notification",
};

exports.initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || "*",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("⚡ Socket connected:", socket.id);

    socket.on(EVENTS.JOIN_CONTACT, ({ contactId }) => {
      if (!contactId) return;
      socket.join(contactId);
    });

    socket.on(EVENTS.LEAVE_CONTACT, ({ contactId }) => {
      if (!contactId) return;
      socket.leave(contactId);
    });

    socket.on(EVENTS.TYPING, ({ contactId, user }) => {
      if (!contactId) return;

      socket.to(contactId).emit(EVENTS.TYPING, {
        contactId,
        user,
      });
    });

    socket.on(EVENTS.STOP_TYPING, ({ contactId }) => {
      if (!contactId) return;

      socket.to(contactId).emit(EVENTS.STOP_TYPING, {
        contactId,
      });
    });

    socket.on("send_message", ({ conversationId, message, sender }) => {
      if (!conversationId || !message) return;

      const payload = {
        conversationId,
        message,
        sender,
        createdAt: new Date(),
      };

      io.to(conversationId).emit(EVENTS.CONTACT_REPLY_RECEIVE, payload);
    });

    socket.on(EVENTS.NEW_CONTACT_MESSAGE, (data) => {
      io.emit(EVENTS.CONTACT_NOTIFICATION, {
        ...data,
        createdAt: new Date(),
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);
    });
  });
};

exports.getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};
