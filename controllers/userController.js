const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError("User not found", 404);
  res.json({ success: true, data: user.toPublicJSON() });
});

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  res.json({
    success: true,
    count: users.length,
    data: users.map((u) => u.toPublicJSON()),
  });
});

exports.getUserById = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw new AppError("Invalid user ID", 400);

  const user = await User.findById(req.params.id).select("-password");
  if (!user) throw new AppError("User not found", 404);

  res.json({ success: true, data: user.toPublicJSON() });
});

exports.updateMe = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;

  if (Object.keys(updateData).length === 0) {
    throw new AppError(
      "No valid fields to update. You can update name and phone.",
      400,
    );
  }

  const user = await User.findByIdAndUpdate(req.user.id, updateData, {
    returnDocument: "after",
    runValidators: true,
  }).select("-password");

  if (!user) throw new AppError("User not found", 404);

  res.json({ success: true, data: user.toPublicJSON() });
});

exports.updateUser = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) throw new AppError("Invalid user ID", 400);

  const { name, phone, role, status } = req.body;
  const updateData = {};

  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (status !== undefined) updateData.status = status;

  if (role !== undefined) {
    if (req.user.role !== "admin") {
      throw new AppError("Only admins can change user roles", 403);
    }
    const VALID_ROLES = ["admin", "manager", "staff", "employee"];
    if (!VALID_ROLES.includes(role)) {
      throw new AppError(
        `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
        400,
      );
    }
    updateData.role = role;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError("No valid fields to update.", 400);
  }

  const user = await User.findByIdAndUpdate(req.params.id, updateData, {
    returnDocument: "after",
    runValidators: true,
  }).select("-password");

  if (!user) throw new AppError("User not found", 404);

  res.json({ success: true, data: user.toPublicJSON() });
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
