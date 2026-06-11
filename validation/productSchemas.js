const { z } = require("zod");

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID format");

const productStatus = z.enum(["active", "inactive"], {
  errorMap: () => ({ message: "Status must be active or inactive" }),
});

const supplierField = z
  .union([objectId, z.literal(""), z.null()])
  .optional()
  .transform((val) => {
    if (val === "" || val === null) return null;
    return val;
  });

exports.createProductSchema = z.object({
  name: z.string().min(1, "Name is required").max(200).trim(),
  sku: z.string().max(100).trim().optional(),
  description: z.string().max(500).trim().optional().default(""),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  costPrice: z.coerce.number().min(0, "Cost price cannot be negative"),
  category: z.string().min(1, "Category is required").trim(),
  quantity: z.coerce.number().min(0).optional().default(0),
  status: productStatus.optional().default("active"),
  supplier: supplierField,
});

exports.updateProductSchema = z
  .object({
    name: z.string().min(1).max(200).trim().optional(),
    sku: z.string().max(100).trim().optional(),
    description: z.string().max(500).trim().optional(),
    price: z.coerce.number().min(0).optional(),
    costPrice: z.coerce.number().min(0).optional(),
    category: z.string().min(1).trim().optional(),
    quantity: z.coerce.number().min(0).optional(),

    status: productStatus.optional(),
    supplier: supplierField,
  })

  .transform((data) =>
    Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined)),
  );

exports.productQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(10),
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  status: productStatus.optional(),
  supplier: objectId.optional(),
});
