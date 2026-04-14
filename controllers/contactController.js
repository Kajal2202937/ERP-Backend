const contactService = require("../services/contactService");

// ================= CREATE =================
exports.createContact = async (req, res) => {
  try {
    const contact = await contactService.createContact(req.body);

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

// ================= GET ALL =================
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

// ================= UPDATE =================
exports.updateContact = async (req, res) => {
  try {
    const { status } = req.body;

    const updated = await contactService.updateContactStatus(
      req.params.id,
      status
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

// ================= DELETE =================
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