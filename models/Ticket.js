const mongoose = require("mongoose");


const messageSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [5000, "Message cannot exceed 5000 characters"],
    },
    sender: {
      type: String,
      enum: ["admin", "user"],
      required: true,
    },
    seen: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);


const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      index: true,
    },

    subject: {
      type: String,
      trim: true,
      default: "General Inquiry",
      maxlength: [200, "Subject cannot exceed 200 characters"],
    },

    status: {
      type: String,
      enum: ["new", "open", "in_progress", "waiting_for_user", "resolved", "closed"],
      default: "new",
      index: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    messages: [messageSchema],

    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },

    readByAdmin: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);


ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ email: 1, createdAt: -1 });
ticketSchema.index({ lastMessageAt: -1 });


ticketSchema.virtual("unreadCount").get(function () {
  return this.messages.filter((m) => !m.seen && m.sender === "user").length;
});


ticketSchema.pre("save", function (next) {
  if (this.isModified("messages")) {
    this.lastMessageAt = new Date();
  }
});

module.exports = mongoose.model("Ticket", ticketSchema);