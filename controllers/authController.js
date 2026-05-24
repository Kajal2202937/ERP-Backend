const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

const generateToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const VALID_ROLES = ["admin", "manager", "staff", "employee"];

exports.registerUser = asyncHandler(async (req, res) => {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    throw new AppError(
      "Public registration is disabled. Contact your administrator to create an account.",
      403,
    );
  }

  const { name, email, password, phone } = req.body;
  if (!name || !email || !password)
    throw new AppError("Name, email and password are required", 400);
  if (password.length < 8)
    throw new AppError("Password must be at least 8 characters", 400);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError("Email is already registered", 400);

  const hashedPassword = await bcrypt.hash(password, 12);

  const userData = {
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: "admin",
    status: "active",
  };
  if (phone && phone.trim()) userData.phone = phone.trim();

  const user = await User.create(userData);

  res.status(201).json({
    success: true,
    message: "Admin account created successfully",
    data: user.toPublicJSON(),
    token: generateToken(user),
  });
});

exports.createUser = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword, phone, role, status } =
    req.body;

  if (!name || !email || !password || !confirmPassword)
    throw new AppError(
      "Name, email, password, and confirm password are required",
      400,
    );
  if (password.length < 8)
    throw new AppError("Password must be at least 8 characters", 400);
  if (password !== confirmPassword)
    throw new AppError("Passwords do not match", 400);

  const assignedRole = role || "staff";
  if (!VALID_ROLES.includes(assignedRole))
    throw new AppError(
      `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`,
      400,
    );

  if (assignedRole === "admin" && req.user.role !== "admin")
    throw new AppError("Only admins can create admin accounts", 403);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError("This email is already registered", 400);

  const hashedPassword = await bcrypt.hash(password, 12);

  const userData = {
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: assignedRole,
    status: status || "active",
    createdBy: req.user._id,
  };
  if (phone && phone.trim()) userData.phone = phone.trim();

  const newUser = await User.create(userData);

  res.status(201).json({
    success: true,
    message: `User "${newUser.name}" created successfully as ${newUser.role}`,
    data: newUser.toPublicJSON(),
  });
});

exports.loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    throw new AppError("Email and password are required", 400);

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+password",
  );
  if (!user) throw new AppError("Invalid email or password", 401);
  if (!user.isActive)
    throw new AppError("Account is deactivated. Contact admin.", 403);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError("Invalid email or password", 401);

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: user.toPublicJSON(),
    token: generateToken(user),
  });
});

exports.logoutUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    message: "Logout successful. Please clear your token on the client.",
  });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    throw new AppError("Old password and new password are required", 400);
  if (newPassword.length < 8)
    throw new AppError("New password must be at least 8 characters", 400);

  const user = await User.findById(req.user.id).select("+password");
  if (!user) throw new AppError("User not found", 404);

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) throw new AppError("Old password is incorrect", 400);

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(
    req.user.id,
    { password: hashedPassword },
    { runValidators: false },
  );

  res
    .status(200)
    .json({ success: true, message: "Password changed successfully" });
});

exports.getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({})
    .populate("createdBy", "name email role")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: users.length,
    data: users.map((u) => u.toPublicJSON()),
  });
});

exports.updateUserStatus = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  const validStatuses = ["active", "inactive", "suspended"];
  if (!validStatuses.includes(status))
    throw new AppError(
      `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      400,
    );

  if (userId === req.user._id.toString())
    throw new AppError("You cannot change your own account status", 400);

  const user = await User.findByIdAndUpdate(
    userId,
    { status, isActive: status === "active" },
    { new: true, runValidators: false },
  );
  if (!user) throw new AppError("User not found", 404);

  res.status(200).json({
    success: true,
    message: `User status updated to "${status}"`,
    data: user.toPublicJSON(),
  });
});
