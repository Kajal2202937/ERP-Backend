const contactService = require("../services/contactService");
const { getIO } = require("../socket");
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

    io.emit("contact_notification", contact);

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: contact.email,
      subject: "We received your message",
      html: `
        <h3>Hello ${contact.name}</h3>
        <p>Thanks for contacting us. Our team will respond shortly.</p>
      `,
    });

    res.status(201).json({
      success: true,
      data: contact,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
exports.getContacts = async (req, res) => {
  try {
    const contacts = await contactService.getAllContacts();

    res.json({
      success: true,
      data: contacts,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
exports.updateContact = async (req, res) => {
  try {
    const updated = await contactService.updateContactStatus(
      req.params.id,
      req.body.status,
    );

    res.json({
      success: true,
      data: updated,
    });
  } catch (err) {
    res.status(404).json({
      success: false,
      message: err.message,
    });
  }
};
exports.deleteContact = async (req, res) => {
  try {
    await contactService.deleteContact(req.params.id);

    res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (err) {
    res.status(404).json({
      success: false,
      message: err.message,
    });
  }
};
exports.replyContact = async (req, res) => {
  try {
    const { message, tempId } = req.body; 

    const contact = await contactService.addReply(req.params.id, message);

    const io = getIO();

    
    const lastReply = contact.replies[contact.replies.length - 1];

    const replyPayload = {
      _id: lastReply._id, 
      contactId: contact._id,
      message,
      sender: "admin",
      tempId, 
      createdAt: lastReply.createdAt,
    };

    console.log("EMITTING:", replyPayload); 

    io.to(contact._id.toString()).emit("contact_reply_receive", replyPayload);

    res.json({
      success: true,
      data: contact,
    });
  } catch (err) {
    
    res.status(400).json({
      success: false,
      message: err.message,
    });
  }
};
