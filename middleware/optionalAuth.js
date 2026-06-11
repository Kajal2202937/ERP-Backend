const jwt = require("jsonwebtoken");
const User = require("../models/User");

const optionalAuth = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token =
      (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) ||
      req.cookies?.token ||
      null;

    if (!token) {
      req.user = null;
      return next();
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      req.user = null;
      return next();
    }

    const user = await User.findById(decoded.id).select(
      "-password +tokenVersion",
    );

    if (!user) {
      req.user = null;
      return next();
    }

    if (decoded.tv !== user.tokenVersion) {
      req.user = null;
      return next();
    }

    if (!user.isActive) {
      req.user = null;
      return next();
    }

    user.tokenVersion = undefined;
    req.user = user;
  } catch {
    req.user = null;
  }

  next();
};

module.exports = { optionalAuth };
