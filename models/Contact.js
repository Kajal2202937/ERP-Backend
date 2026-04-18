const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true },
    subject: { type: String, default: "general" },
    message: { type: String, required: true },

    status: {
      type: String,
      enum: ["new", "read", "replied"],
      default: "new",
    },

    replies: [
      {
        message: { type: String, required: true }, 
        sender: { type: String, enum: ["admin", "user"] },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    readByAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Contact", contactSchema);
