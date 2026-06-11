const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID format");

const productionStatus = z.enum(["started", "in-progress", "completed"], {
  errorMap: () => ({
    message: "Status must be started, in-progress, or completed",
  }),
});

exports.createProductionSchema = z.object({
  product: objectId,
  quantityProduced: z.coerce
    .number()
    .int()
    .min(1, "Quantity must be at least 1"),
  notes: z.string().max(500).trim().optional().default(""),
  productionDate: z.string().datetime({ offset: true }).optional(),
});

exports.updateProductionSchema = z.object({
  status: productionStatus.optional(),
  quantityProduced: z.coerce.number().int().min(1).optional(),
  notes: z.string().max(500).trim().optional(),
  productionDate: z.string().datetime({ offset: true }).optional(),
});

exports.productionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(10),
  search: z.string().trim().optional(),
  status: productionStatus.optional(),
});
