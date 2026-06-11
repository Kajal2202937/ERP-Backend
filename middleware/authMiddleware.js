const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AppError = require("../utils/AppError");
const asyncHandler = require("./asyncHandler");

exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

if (!token) {
  console.log("AUTH DEBUG:", {
    cookieToken: !!req.cookies?.token,
    authHeader: req.headers.authorization,
    cookies: req.cookies,
    origin: req.headers.origin,
  });

  throw new AppError("Not authorized. Please log in.", 401);
}
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id).select(
    "-password +tokenVersion",
  );

  if (!user) {
    throw new AppError(
      "The user belonging to this token no longer exists.",
      401,
    );
  }

  if (decoded.tv !== user.tokenVersion) {
    throw new AppError("Your session has expired. Please log in again.", 401);
  }

  if (!user.isActive) {
    throw new AppError(
      "Your account has been deactivated. Please contact admin.",
      403,
    );
  }

  user.tokenVersion = undefined;
  req.user = user;
  next();
});

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Not authenticated.", 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. Your role (${req.user.role}) is not authorized for this action.`,
          403,
        ),
      );
    }

    next();
  };
};

exports.hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Not authenticated.", 401));
    }

    if (!req.user.permissions?.includes(permission)) {
      return next(
        new AppError(
          `Access denied. Missing required permission: ${permission}`,
          403,
        ),
      );
    }

    next();
  };
};
