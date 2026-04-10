// Import required modules
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Protect Routes Middleware
exports.protect = async (req, res, next) => {
  let token;

  try {
    // Check token in headers (Authorization: Bearer token)
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // If no token
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from DB (excluding password)
    req.user = await User.findById(decoded.id).select("-password");

    // If user not found
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user is active
    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    next(); // move to next middleware/controller
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
    });
  }
};

// ==============================
// 🛡️ Role-Based Authorization
// ==============================
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Check if user role is allowed
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: " Access denied. Role (${req.user.role}) not allowed ",
      });
    }

    next();
  };
};
