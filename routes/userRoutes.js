const express = require("express"); // Import Express
const router = express.Router(); // Create router instance

// Import controller functions
const {
  createUser,
  getMe,
  getUsers,
  getUserById,
  updateMe,
  updateUser,
  deleteMe,
  deleteUser,
} = require("../controllers/userController");

// Import authentication & authorization middleware
const { protect, authorize } = require("../middleware/authMiddleware");

// ================= CREATE =================

// Route: POST /api/users/admin
// Access: Admin only
router.post(
  "/admin", // Endpoint
  protect, // Step 1: Check JWT token (user must be logged in)
  authorize("admin"), // Step 2: Allow only admin role
  createUser, // Step 3: Call controller to create user
);

// ================= READ =================

// Route: GET /api/users/me
// Access: Logged-in user
router.get(
  "/me", // Endpoint for current user
  protect, // Verify token
  getMe, // Return logged-in user data
);

// Route: GET /api/users
// Access: Admin + Manager
router.get(
  "/", // Endpoint to get all users
  protect, // Verify token
  authorize("admin", "manager"), // Allow admin & manager
  getUsers, // Fetch all users
);

// ⚠️ Important: Keep dynamic route last
// Route: GET /api/users/:id
// Access: Admin + Manager
router.get(
  "/:id", // Dynamic route (user ID)
  protect, // Verify token
  authorize("admin", "manager"), // Allow admin & manager
  getUserById, // Fetch specific user
);

// ================= UPDATE =================

// Route: PUT /api/users/me
// Access: Logged-in user
router.put(
  "/me", // Update own profile
  protect, // Verify token
  updateMe, // Update user data
);

// Route: PUT /api/users/:id
// Access: Admin + Manager
router.put(
  "/:id", // Update any user
  protect, // Verify token
  authorize("admin", "manager"), // Allow admin & manager
  updateUser, // Update user
);

// ================= DELETE =================

// Route: DELETE /api/users/me
// Access: Logged-in user
router.delete(
  "/me", // Delete own account
  protect, // Verify token
  deleteMe, // Delete current user
);

// Route: DELETE /api/users/:id
// Access: Admin only
router.delete(
  "/:id", // Delete any user
  protect, // Verify token
  authorize("admin"), // Only admin allowed
  deleteUser, // Delete user
);

module.exports = router; // Export router
