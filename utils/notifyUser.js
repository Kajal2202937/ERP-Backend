const { getIO } = require("../socket");
const Notification = require("../models/Notification");

const notifyUser = async (userId, payload) => {
  try {
    if (!userId) return;

    
    const notification = await Notification.create({
      userId,
      title: payload.title,
      desc: payload.desc,
      type: payload.type || "general",
    });

    
    const io = getIO();

    io.to(userId.toString()).emit("notification", {
      id: notification._id,
      title: notification.title,
      desc: notification.desc,
      type: notification.type,
      read: notification.read,
      createdAt: notification.createdAt,
    });

    return notification;
  } catch (err) {
    console.error("Notification Error:", err.message);
  }
};

module.exports = notifyUser;
