const { Server } = require("socket.io");
const Contact = require("../models/Contact"); 

let io;

const EVENTS = {
  JOIN_CONTACT: "join_contact",
  LEAVE_CONTACT: "leave_contact",
  JOIN_ADMIN: "join_admin",                                      

  TYPING: "typing",
  STOP_TYPING: "stop_typing",

  CONTACT_REPLY_RECEIVE: "contact_reply_receive",
  CONTACT_REPLY_RECEIVE_ADMIN: "contact_reply_receive_admin",   
  CONTACT_SEEN: "contact_message_seen",
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
    console.log(`⚡ Socket connected: ${socket.id}`);

    const token = socket.handshake.auth?.token;
    if (!token && process.env.NODE_ENV === "production") {
      console.log("Unauthorized socket attempt");
      socket.disconnect(true);
      return;
    }

    socket.broadcast.emit(EVENTS.USER_ONLINE);

    
    socket.on(EVENTS.JOIN_ADMIN, () => {
      socket.join("admin_room");
      console.log(`Admin socket ${socket.id} joined admin_room`);
    });

    socket.on(EVENTS.JOIN_CONTACT, async ({ contactId }) => {
      if (!contactId) return;
      const roomId = String(contactId);
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);

      try {
        await Contact.findByIdAndUpdate(contactId, {
          readByAdmin: true,
          status: "read",
        });
      } catch (err) {
        console.error("Failed to mark contact as read:", err.message);
      }
    });

    socket.on(EVENTS.LEAVE_CONTACT, ({ contactId }) => {
      if (!contactId) return;
      socket.leave(String(contactId));
    });

    socket.on(EVENTS.TYPING, ({ contactId }) => {
      if (!contactId) return;
      socket.to(String(contactId)).emit(EVENTS.TYPING, { contactId });
    });

    socket.on(EVENTS.STOP_TYPING, ({ contactId }) => {
      if (!contactId) return;
      socket.to(String(contactId)).emit(EVENTS.STOP_TYPING, { contactId });
    });

    socket.on(EVENTS.CONTACT_SEEN, ({ contactId }) => {
      if (!contactId) return;
      socket.to(String(contactId)).emit(EVENTS.CONTACT_SEEN, { contactId });
    });

    socket.on("disconnect", () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      socket.broadcast.emit(EVENTS.USER_OFFLINE);
    });
  });
};

exports.getIO = () => {
  if (!io) throw new Error("Socket.io not initialized. Call initSocket(server) first.");
  return io;
};

exports.EVENTS = EVENTS; 