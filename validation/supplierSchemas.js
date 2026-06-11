const { z } = require("zod");

const supplierStatus = z.enum(["active", "inactive"], {
  errorMap: () => ({ message: "Status must be active or inactive" }),
});

exports.createSupplierSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  company: z.string().max(100).trim().optional().default(""),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  phone: z.string().min(1, "Phone is required").max(20).trim(),
  address: z.string().max(300).trim().optional().default(""),
  status: supplierStatus.optional().default("active"),
});

exports.updateSupplierSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  company: z.string().max(100).trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
  phone: z.string().max(20).trim().optional(),
  address: z.string().max(300).trim().optional(),
  status: supplierStatus.optional(),
});

exports.supplierQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(1000).optional().default(10),
  search: z.string().trim().optional().default(""),
  status: supplierStatus.optional(),
});

exports.bulkDeleteSchema = z.object({
  ids: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, "Invalid supplier ID"))
    .min(1, "At least one ID is required"),
});
