const mongoose = require("mongoose");
const Contact = require("../models/Contact");

const createContact = async (data) => {
  const { name, email, subject, message } = data;
  if (!name || !email || !message) throw new Error("All fields are required");
  return await Contact.create({ name, email, subject, message });
};

const getAllContacts = async () => {
  return await Contact.find().sort({ createdAt: -1 });
};

const updateContactStatus = async (id, status) => {
  const contact = await Contact.findByIdAndUpdate(
    id,
    { status },
    { new: true },
  );
  if (!contact) throw new Error("Contact not found");
  return contact;
};

const deleteContact = async (id) => {
  const contact = await Contact.findByIdAndDelete(id);
  if (!contact) throw new Error("Contact not found");
  return true;
};

const addReply = async (id, message, sender = "user") => {
  const contact = await Contact.findById(id);
  if (!contact) throw new Error("Contact not found");

  contact.replies.push({
    message: message.trim(),
    sender,
    createdAt: new Date(),
  });

  if (sender === "admin") {
    contact.status = "replied";
  } else if (contact.status === "resolved") {
    contact.status = "replied";
  }

  await contact.save();
  return contact;
};

module.exports = {
  createContact,
  getAllContacts,
  updateContactStatus,
  deleteContact,
  addReply,
};
