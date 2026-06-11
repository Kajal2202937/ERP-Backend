const { z } = require("zod");

const email = z.string().email("Invalid email address").toLowerCase().trim();
const password = z.string().min(8, "Password must be at least 8 characters");
const name = z
  .string()
  .min(3, "Name must be at least 3 characters")
  .max(50)
  .trim();

const phone = z
  .string()
  .regex(
    /^\+?[0-9]{7,15}$/,
    "Phone must be 7–15 digits, optionally preceded by +",
  )
  .optional();

const role = z.enum(["admin", "manager", "staff", "employee"], {
  errorMap: () => ({
    message: "Role must be admin, manager, staff, or employee",
  }),
});

const status = z.enum(["active", "inactive", "suspended"], {
  errorMap: () => ({
    message: "Status must be active, inactive, or suspended",
  }),
});

const registerSchema = z.object({ name, email, password, phone });

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

const createUserSchema = z
  .object({
    name,
    email,
    password,
    confirmPassword: z.string().min(1, "Confirm password is required"),
    phone,
    role: role.optional().default("staff"),
    status: status.optional().default("active"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: password,
  })
  .refine((data) => data.oldPassword !== data.newPassword, {
    message: "New password must be different from old password",
    path: ["newPassword"],
  });

const updateUserStatusSchema = z.object({ status });

const forgotPasswordSchema = z.object({
  email,
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required").trim(),
  newPassword: password,
});

module.exports = {
  registerSchema,
  loginSchema,
  createUserSchema,
  changePasswordSchema,
  updateUserStatusSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
};
