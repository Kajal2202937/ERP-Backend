// Import mongoose to create schema and interact with MongoDB
const mongoose = require("mongoose");

// Create a schema for User collection
const userSchema = new mongoose.Schema(
  {
    // User full name
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    // Email address
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },

    // Password
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // Hidden from queries
    },

    // User role
    role: {
      type: String,
      enum: ["admin", "manager", "staff"],
      default: "staff",
    },

    // Phone number
    phone: {
      type: String,
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"],
    },

    // Account status
    isActive: {
      type: Boolean,
      default: true,
    },
  },

  {
    timestamps: true,
  },
);

// ================= EXPORT MODEL =================
module.exports = mongoose.model("User", userSchema);
