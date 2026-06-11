const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

const VALID_ROLES = ["admin", "manager", "staff", "employee"];

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const COOKIE_NAME = "token";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};
const CLEAR_COOKIE_OPTIONS = { ...COOKIE_OPTIONS, maxAge: 0 };

const generateToken = (user) => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new AppError("JWT configuration error. Contact administrator.", 500);
  }
  return jwt.sign(
    { id: user._id, role: user.role, tv: user.tokenVersion },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );
};

exports.registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password)
    throw new AppError("Name, email and password are required", 400);
  if (password.length < 8)
    throw new AppError("Password must be at least 8 characters", 400);

  const hashedPassword = await bcrypt.hash(password, 12);
  const userData = {
    name,
    email: email.toLowerCase(),
    password: hashedPassword,
    role: "admin",
    status: "active",
    tokenVersion: 0,
  };
  if (phone && phone.trim()) userData.phone = phone.trim();

  const result = await User.findOneAndUpdate(
    {},
    { $setOnInsert: userData },
    {
      upsert: true,
      returnDocument: "after",
      rawResult: true,
      select: "+tokenVersion",
    },
  );

  if (!result.lastErrorObject?.upserted) {
    throw new AppError(
      "Public registration is disabled. Contact your administrator to create an account.",
      403,
    );
  }

  const user = result.value;
  const userWithTv = await User.findById(user._id).select("+tokenVersion");
  const token = generateToken(userWithTv);

  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.status(201).json({
    success: true,
    message: "Admin account created successfully",
    data: user.toPublicJSON(),
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
    tokenVersion: 0,
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
    "+password +tokenVersion",
  );
  if (!user) throw new AppError("Invalid email or password", 401);
  if (!user.isActive)
    throw new AppError("Account is deactivated. Contact admin.", 403);

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw new AppError("Invalid email or password", 401);

  const token = generateToken(user);

  res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    message: "Login successful",
    data: user.toPublicJSON(),
  });
});

exports.logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $inc: { tokenVersion: 1 } },
    { runValidators: false },
  );
  res.clearCookie(COOKIE_NAME, CLEAR_COOKIE_OPTIONS);
  res.status(200).json({ success: true, message: "Logged out successfully." });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    throw new AppError("Old password and new password are required", 400);
  if (newPassword.length < 8)
    throw new AppError("New password must be at least 8 characters", 400);
  if (oldPassword === newPassword)
    throw new AppError(
      "New password must be different from the old password",
      400,
    );

  const user = await User.findById(req.user.id).select(
    "+password +tokenVersion",
  );
  if (!user) throw new AppError("User not found", 404);

  const isMatch = await bcrypt.compare(oldPassword, user.password);
  if (!isMatch) throw new AppError("Old password is incorrect", 400);

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  const newVersion = (user.tokenVersion || 0) + 1;

  await User.findByIdAndUpdate(
    req.user.id,
    { password: hashedPassword, $inc: { tokenVersion: 1 } },
    { runValidators: false },
  );

  user.tokenVersion = newVersion;
  const newToken = generateToken(user);
  res.cookie(COOKIE_NAME, newToken, COOKIE_OPTIONS);
  res.status(200).json({
    success: true,
    message:
      "Password changed successfully. All other sessions have been logged out.",
  });
});

exports.getAllUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim();
  const role = req.query.role?.trim();
  const status = req.query.status?.trim();

  const filter = {};
  if (role && VALID_ROLES.includes(role)) filter.role = role;
  if (status && ["active", "inactive", "suspended"].includes(status))
    filter.status = status;
  if (search) {
    const safe = escapeRegex(search);
    filter.$or = [
      { name: { $regex: safe, $options: "i" } },
      { email: { $regex: safe, $options: "i" } },
    ];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  const pages = Math.ceil(total / limit) || 1;

  res.status(200).json({
    success: true,
    data: users.map((u) => u.toPublicJSON()),
    total,
    page,
    pages,
    count: users.length,
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

  const isDeactivating = status !== "active";
  const updatePayload = {
    status,
    isActive: status === "active",
    ...(isDeactivating && { $inc: { tokenVersion: 1 } }),
  };

  const user = await User.findByIdAndUpdate(userId, updatePayload, {
    returnDocument: "after",
    runValidators: false,
  });
  if (!user) throw new AppError("User not found", 404);

  res.status(200).json({
    success: true,
    message: `User status updated to "${status}"${isDeactivating ? ". Their active sessions have been invalidated." : ""}`,
    data: user.toPublicJSON(),
  });
});
