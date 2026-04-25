const { Server } = require("socket.io");

let io;

const EVENTS = {
  JOIN_CONTACT: "join_contact",
  LEAVE_CONTACT: "leave_contact",

  TYPING: "contact_typing",
  STOP_TYPING: "contact_stop_typing",

  CONTACT_REPLY_RECEIVE: "contact_reply_receive",
  CONTACT_DELIVERED: "contact_message_delivered",
  CONTACT_SEEN: "contact_message_seen",

  NEW_CONTACT_MESSAGE: "new_contact_message",
  CONTACT_NOTIFICATION: "contact_notification",

  USER_ONLINE: "contact_user_online",
  USER_OFFLINE: "contact_user_offline",
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

    socket.broadcast.emit(EVENTS.USER_ONLINE);

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

    socket.on("send_message", ({ contactId, message, sender, tempId }) => {
      if (!contactId || !message) return;

      const payload = {
        contactId,
        message,
        sender,
        tempId,
        createdAt: new Date(),
      };

      socket.to(contactId).emit(EVENTS.CONTACT_REPLY_RECEIVE, payload);

      socket.emit(EVENTS.CONTACT_REPLY_RECEIVE, payload);

      socket.emit(EVENTS.CONTACT_DELIVERED, { tempId });
    });

    socket.on(EVENTS.CONTACT_SEEN, ({ contactId }) => {
      socket.to(contactId).emit(EVENTS.CONTACT_SEEN);
    });

    socket.on(EVENTS.NEW_CONTACT_MESSAGE, (data) => {
      io.emit(EVENTS.CONTACT_NOTIFICATION, {
        ...data,
        createdAt: new Date(),
      });
    });

    socket.on("disconnect", () => {
      console.log("❌ Disconnected:", socket.id);

      socket.broadcast.emit(EVENTS.USER_OFFLINE);
    });
  });
};

exports.getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};
