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
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/logout", protect, logoutUser);
router.post("/change-password", protect, changePassword);

router.post(
  "/users/create",
  protect,
  authorize("admin", "manager"),
  createUser,
);

router.get("/users", protect, authorize("admin", "manager"), getAllUsers);

router.patch(
  "/users/:userId/status",
  protect,
  authorize("admin"),
  updateUserStatus,
);

module.exports = router;
