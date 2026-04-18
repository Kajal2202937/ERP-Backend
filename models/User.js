
const mongoose = require("mongoose");


const userSchema = new mongoose.Schema(
  {
    
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },

    
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, 
    },

    
    role: {
      type: String,
      enum: ["admin", "manager", "staff"],
      default: "staff",
    },

    
    phone: {
      type: String,
      match: [/^[0-9]{10}$/, "Phone number must be 10 digits"],
    },

    
    isActive: {
      type: Boolean,
      default: true,
    },
  },

  {
    timestamps: true,
  },
);


module.exports = mongoose.model("User", userSchema);
