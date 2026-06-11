const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID format");

exports.createOrderSchema = z.object({
  product: objectId,
  quantity: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1"),
  notes: z.string().max(500).trim().optional().default(""),
  customer: z
    .object({
      name: z.string().max(100).trim().optional().default(""),
      email: z
        .string()
        .email("Invalid customer email")
        .toLowerCase()
        .trim()
        .optional()
        .or(z.literal(""))
        .default(""),
      phone: z.string().max(20).trim().optional().default(""),
      address: z.string().max(300).trim().optional().default(""),
    })
    .optional()
    .default({}),
});

exports.updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "completed", "cancelled"], {
    errorMap: () => ({
      message: "Status must be pending, completed, or cancelled",
    }),
  }),
  note: z.string().max(500).trim().optional().default(""),
});

exports.orderIdParamSchema = z.object({
  id: objectId,
});
