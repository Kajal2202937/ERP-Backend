const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  logoutUser,
  changePassword,
  createUser,
  getAllUsers,
  updateUserStatus,
} = require("../controllers/authController");

const {
  forgotPassword,
  resetPassword,
} = require("../controllers/forgotPasswordController");

const { protect, authorize } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");
const { auditMiddleware } = require("../middleware/auditLog");

const {
  registerSchema,
  loginSchema,
  createUserSchema,
  changePasswordSchema,
  updateUserStatusSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("../validation/authSchemas");

router.post(
  "/register",
  validate(registerSchema),
  auditMiddleware(
    "CREATE",
    "Auth",
    (req) => `First admin registered: ${req.body.email}`,
  ),
  registerUser,
);

router.post(
  "/login",
  validate(loginSchema),
  auditMiddleware("LOGIN", "Auth", (req) => `Login attempt: ${req.body.email}`),
  loginUser,
);

router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

router.post(
  "/logout",
  protect,
  auditMiddleware("LOGOUT", "Auth", (req) => `Logout: ${req.user?.email}`),
  logoutUser,
);

router.post(
  "/change-password",
  protect,
  validate(changePasswordSchema),
  auditMiddleware(
    "UPDATE",
    "Auth",
    (req) => `Password changed: ${req.user?.email}`,
  ),
  changePassword,
);

router.post(
  "/users/create",
  protect,
  authorize("admin", "manager"),
  validate(createUserSchema),
  auditMiddleware(
    "CREATE",
    "User",
    (req) => `User created: ${req.body.email} as ${req.body.role}`,
  ),
  createUser,
);

router.get("/users", protect, authorize("admin", "manager"), getAllUsers);

router.patch(
  "/users/:userId/status",
  protect,
  authorize("admin"),
  validate(updateUserStatusSchema),
  auditMiddleware(
    "STATUS_CHANGE",
    "User",
    (req) => `Status set to ${req.body.status} for user ${req.params.userId}`,
  ),
  updateUserStatus,
);

module.exports = router;
