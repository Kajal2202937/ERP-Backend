const contactService = require("../services/contactService");
const { getIO, EVENTS } = require("../socket");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.createContact = async (req, res) => {
  try {
    const contact = await contactService.createContact(req.body);
    const io = getIO();

    io.to("admin_room").emit(EVENTS.CONTACT_NOTIFICATION, contact);

    transporter
      .sendMail({
        from: process.env.EMAIL_USER,
        to: contact.email,
        subject: "We received your message",
        html: `
        <h3>Hello ${contact.name}</h3>
        <p>Thanks for contacting us. Our team will respond shortly.</p>
      `,
      })
      .catch((err) => console.log("Email error:", err.message));

    res.status(201).json({ success: true, data: contact });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const contacts = await contactService.getAllContacts();
    res.json({ success: true, data: contacts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const updated = await contactService.updateContactStatus(
      req.params.id,
      req.body.status,
    );
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

exports.deleteContact = async (req, res) => {
  try {
    await contactService.deleteContact(req.params.id);
    res.json({ success: true, message: "Message deleted successfully" });
  } catch (err) {
    res.status(404).json({ success: false, message: err.message });
  }
};

exports.replyContact = async (req, res) => {
  try {
    const { message, tempId } = req.body;
    const sender = req.user ? req.body.sender || "admin" : "user";
    const contactId = req.params.id;

    if (!message?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required" });
    }

    const contact = await contactService.addReply(
      contactId,
      message.trim(),
      sender,
    );
    const io = getIO();
    const lastReply = contact.replies[contact.replies.length - 1];

    const replyPayload = {
      _id: lastReply._id,
      contactId: contact._id.toString(),
      message: lastReply.message,
      sender: lastReply.sender,
      tempId: tempId || null,
      createdAt: lastReply.createdAt,
    };

    io.to(contact._id.toString()).emit(
      EVENTS.CONTACT_REPLY_RECEIVE,
      replyPayload,
    );

    io.to("admin_room").emit(EVENTS.CONTACT_REPLY_RECEIVE_ADMIN, replyPayload);

    if (sender === "admin") {
      await contactService.updateContactStatus(contact._id, "replied");
    }

    return res.json({ success: true, data: replyPayload });
  } catch (err) {
    console.error("Reply error:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
};
