const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID format");

exports.addStockSchema = z.object({
  product: objectId,
  quantity: z.coerce.number().int().min(1, "Quantity must be at least 1"),
  location: z.string().max(200).trim().optional(),
  lowStockLimit: z.coerce.number().int().min(0).optional(),
  source: z.enum(["MANUAL", "ADJUSTMENT"]).optional().default("MANUAL"),
  note: z.string().max(500).trim().optional().default(""),
});

exports.updateInventorySchema = z.object({
  quantity: z.coerce.number().int().min(0).optional(),
  lowStockLimit: z.coerce.number().int().min(0).optional(),
  location: z.string().max(200).trim().optional(),
  isActive: z.boolean().optional(),
  archived: z.boolean().optional(),
});

exports.inventoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(10),
  search: z.string().trim().optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  archived: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  lowStock: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
