const jwt = require("jsonwebtoken");

const optionalAuth = (req, _res, next) => {
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch {
    req.user = null;
  }

  next();
};

module.exports = { optionalAuth };
