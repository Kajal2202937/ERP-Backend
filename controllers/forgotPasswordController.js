const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");

const getTransporter = () => {
  const nodemailer = require("nodemailer");
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const RESET_EXPIRY_MS = 60 * 60 * 1000;

exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError("Email is required", 400);

  const genericResponse = {
    success: true,
    message:
      "If an account with that email exists, a reset link has been sent.",
  };

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(200).json(genericResponse);
  }

  const plainToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(plainToken)
    .digest("hex");

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = new Date(Date.now() + RESET_EXPIRY_MS);
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.APP_URL}/reset-password?token=${plainToken}`;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"ERP System" <noreply@erp.com>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <p>Hello ${user.name},</p>
        <p>You requested a password reset. Click the link below to set a new password:</p>
        <p><a href="${resetUrl}" style="color:#6c74f0">Reset Password</a></p>
        <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
        <hr/>
        <p style="font-size:12px;color:#888">Do not share this link with anyone.</p>
      `,
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    console.error(
      JSON.stringify({
        level: "error",
        msg: "password-reset-email-failed",
        error: err.message,
        ts: new Date().toISOString(),
      }),
    );
    throw new AppError(
      "Failed to send reset email. Please try again later.",
      500,
    );
  }

  res.status(200).json(genericResponse);
});

exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword)
    throw new AppError("Token and new password are required", 400);
  if (newPassword.length < 8)
    throw new AppError("Password must be at least 8 characters", 400);

  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: new Date() },
  }).select("+tokenVersion");

  if (!user) throw new AppError("Reset token is invalid or has expired", 400);

  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  user.tokenVersion = (user.tokenVersion || 0) + 1;

  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message:
      "Password reset successfully. Please log in with your new password.",
  });
});
