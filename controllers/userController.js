const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;

  if (!name || !email || !password) {
    throw new AppError("Name, email and password are required", 400);
  }

  if (password.length < 6) {
    throw new AppError("Password must be at least 6 characters", 400);
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    password: await bcrypt.hash(password, 10),
    role: role || "staff",
    phone,
  });

  res.status(201).json({
    success: true,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError("User not found", 404);
  res.json({ success: true, data: user });
});

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  res.json({ success: true, count: users.length, data: users });
});

exports.getUserById = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw new AppError("Invalid user ID", 400);

  const user = await User.findById(req.params.id).select("-password");
  if (!user) throw new AppError("User not found", 404);

  res.json({ success: true, data: user });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const { role, password, isActive, ...updateData } = req.body;

  const user = await User.findByIdAndUpdate(req.user.id, updateData, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) throw new AppError("User not found", 404);

  res.json({ success: true, data: user });
});

exports.updateUser = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw new AppError("Invalid user ID", 400);

  const updateData = { ...req.body };

  if (req.user.role !== "admin") delete updateData.role;

  if (updateData.password) {
    if (updateData.password.length < 6) {
      throw new AppError("Password must be at least 6 characters", 400);
    }
    updateData.password = await bcrypt.hash(updateData.password, 10);
  }

  const user = await User.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) throw new AppError("User not found", 404);

  res.json({ success: true, data: user });
});

exports.deleteMe = asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.user.id);
  res.json({ success: true, message: "Account deleted successfully" });
});

exports.deleteUser = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw new AppError("Invalid user ID", 400);

  if (req.user.id === req.params.id) {
    throw new AppError("Admin cannot delete their own account", 400);
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new AppError("User not found", 404);

  res.json({ success: true, message: "User deleted successfully" });
});
