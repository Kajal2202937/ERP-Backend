const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true },
    subject: { type: String, default: "General Inquiry" },
    message: { type: String, required: true },

    status: {
      type: String,
      enum: ["new", "read", "replied", "resolved"],
      default: "new",
    },

    replies: [
      {
        _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
        message: { type: String, required: true },
        sender: { type: String, enum: ["admin", "user"], required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    readByAdmin: { type: Boolean, default: false },
    lastActivity: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

contactSchema.pre("save", function (next) {
  this.lastActivity = new Date();
  next();
});

module.exports = mongoose.model("Contact", contactSchema);
