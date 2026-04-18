const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = async (req, res, next) => {
  let token;

  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, no token",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (!req.user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed",
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    console.log("User role:", req.user.role);
    console.log("Allowed roles:", roles);

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role (${req.user.role}) not allowed`,
      });
    }

    next();
  };
};
