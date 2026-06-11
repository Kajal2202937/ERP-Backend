const mongoose = require("mongoose");
const Supplier = require("../models/Supplier");
const Product = require("../models/Product");
const AppError = require("../utils/AppError");
const { getRedisClient } = require("../config/redis");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const ANALYTICS_CACHE_KEY = "supplier:analytics";
const ANALYTICS_TTL = 5 * 60;

const getCached = async (key) => {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const val = await redis.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
};

const setCache = (key, data, ttl) => {
  const redis = getRedisClient();
  if (!redis) return;
  redis.setEx(key, ttl, JSON.stringify(data)).catch(() => {});
};

const invalidateAnalytics = () => {
  const redis = getRedisClient();
  if (!redis) return;
  redis.del(ANALYTICS_CACHE_KEY).catch(() => {});
};

const supplierStatsAggregation = () =>
  Product.aggregate([
    {
      $lookup: {
        from: "inventories",
        localField: "_id",
        foreignField: "product",
        as: "inventory",
      },
    },
    { $unwind: { path: "$inventory", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$supplier",
        qty: { $sum: { $ifNull: ["$inventory.quantity", 0] } },
        value: {
          $sum: {
            $multiply: [
              { $ifNull: ["$price", 0] },
              { $ifNull: ["$inventory.quantity", 0] },
            ],
          },
        },
        costValue: {
          $sum: {
            $multiply: [
              { $ifNull: ["$costPrice", 0] },
              { $ifNull: ["$inventory.quantity", 0] },
            ],
          },
        },
        profit: {
          $sum: {
            $multiply: [
              {
                $subtract: [
                  { $ifNull: ["$price", 0] },
                  { $ifNull: ["$costPrice", 0] },
                ],
              },
              { $ifNull: ["$inventory.quantity", 0] },
            ],
          },
        },
        lowStock: {
          $sum: {
            $cond: [
              {
                $lte: [
                  "$inventory.quantity",
                  { $ifNull: ["$inventory.lowStockLimit", 5] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

exports.createSupplier = async (data) => {
  const exists = await Supplier.findOne({ email: data.email?.toLowerCase() });
  if (exists)
    throw new AppError("A supplier with this email already exists", 400);
  const supplier = await Supplier.create(data);
  invalidateAnalytics();
  return supplier;
};

// FIX: The getSuppliers function now correctly maps the `status` field from the
// DB document (which stores "active"/"inactive" as a string) to the frontend.
// Previously, SupplierList.jsx was checking `s.active` (boolean) but the API
// returns `s.status` (string). Fixed in SupplierList.jsx on the frontend.
// On the backend, no filter change is needed — the API correctly supports the
// `status` query param for filtering. The frontend just wasn't sending it.
exports.getSuppliers = async ({
  page = 1,
  limit = 10,
  search = "",
  status,
} = {}) => {
  page = Math.max(parseInt(page) || 1, 1);
  limit = Math.min(Math.max(parseInt(limit) || 10, 1), 10000);
  const skip = (page - 1) * limit;

  const query = {};
  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { name: { $regex: safe, $options: "i" } },
      { email: { $regex: safe, $options: "i" } },
      { phone: { $regex: safe, $options: "i" } },
    ];
  }
  if (status && ["active", "inactive"].includes(status)) {
    query.status = status;
  }

  const [suppliers, total, activeCount, stats] = await Promise.all([
    Supplier.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Supplier.countDocuments(query),
    Supplier.countDocuments({ status: "active" }),
    supplierStatsAggregation(),
  ]);

  const statsMap = {};
  stats.forEach((s) => {
    if (s._id) statsMap[s._id.toString()] = s;
  });

  const finalData = suppliers.map((s) => {
    const st = statsMap[s._id.toString()] || {};
    return {
      ...s,
      // FIX: expose `isActive` boolean derived from the `status` string field
      // so the frontend can use either s.status === "active" or s.isActive
      isActive: s.status === "active",
      stats: {
        qty: st.qty || 0,
        value: st.value || 0,
        costValue: st.costValue || 0,
        profit: st.profit || 0,
        lowStock: st.lowStock || 0,
      },
    };
  });

  const stockValue = stats.reduce((sum, s) => sum + (s.costValue || 0), 0);
  const productCount = stats.reduce((sum, s) => sum + (s.count || 0), 0);

  return {
    data: finalData,
    total,
    totalPages: Math.ceil(total / limit) || 1,
    activeCount,
    productCount,
    stockValue,
  };
};

exports.updateSupplier = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError("Invalid supplier ID", 400);

  const allowed = {};
  if (data.name !== undefined) allowed.name = data.name;
  if (data.company !== undefined) allowed.company = data.company;
  if (data.email !== undefined) allowed.email = data.email;
  if (data.phone !== undefined) allowed.phone = data.phone;
  if (data.address !== undefined) allowed.address = data.address;
  if (data.status !== undefined) {
    if (!["active", "inactive"].includes(data.status))
      throw new AppError("Status must be active or inactive", 400);
    allowed.status = data.status;
  }

  if (!Object.keys(allowed).length)
    throw new AppError("No valid fields to update", 400);

  const supplier = await Supplier.findByIdAndUpdate(id, allowed, {
    new: true,
    runValidators: true,
  });
  if (!supplier) throw new AppError("Supplier not found", 404);
  invalidateAnalytics();
  return supplier;
};

exports.deleteSupplier = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError("Invalid supplier ID", 400);
  const supplier = await Supplier.findByIdAndDelete(id);
  if (!supplier) throw new AppError("Supplier not found", 404);
  invalidateAnalytics();
  return supplier;
};

exports.bulkDelete = async (ids) => {
  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (!validIds.length)
    throw new AppError("No valid supplier IDs provided", 400);
  const result = await Supplier.deleteMany({ _id: { $in: validIds } });
  invalidateAnalytics();
  return result;
};

exports.toggleStatus = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id))
    throw new AppError("Invalid supplier ID", 400);
  const supplier = await Supplier.findById(id);
  if (!supplier) throw new AppError("Supplier not found", 404);
  supplier.status = supplier.status === "active" ? "inactive" : "active";
  const updated = await supplier.save();
  invalidateAnalytics();
  return updated;
};

exports.getSupplierAnalytics = async () => {
  const cached = await getCached(ANALYTICS_CACHE_KEY);
  if (cached) return cached;

  const stats = await Product.aggregate([
    {
      $lookup: {
        from: "inventories",
        localField: "_id",
        foreignField: "product",
        as: "inventory",
      },
    },
    { $unwind: { path: "$inventory", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "suppliers",
        localField: "supplier",
        foreignField: "_id",
        as: "supplierData",
      },
    },
    { $unwind: { path: "$supplierData", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: "$supplier",
        name: { $first: "$supplierData.name" },
        company: { $first: "$supplierData.company" },
        qty: { $sum: { $ifNull: ["$inventory.quantity", 0] } },
        value: {
          $sum: {
            $multiply: [
              { $ifNull: ["$price", 0] },
              { $ifNull: ["$inventory.quantity", 0] },
            ],
          },
        },
        costValue: {
          $sum: {
            $multiply: [
              { $ifNull: ["$costPrice", 0] },
              { $ifNull: ["$inventory.quantity", 0] },
            ],
          },
        },
        profit: {
          $sum: {
            $multiply: [
              {
                $subtract: [
                  { $ifNull: ["$price", 0] },
                  { $ifNull: ["$costPrice", 0] },
                ],
              },
              { $ifNull: ["$inventory.quantity", 0] },
            ],
          },
        },
        lowStock: {
          $sum: {
            $cond: [
              {
                $lte: [
                  "$inventory.quantity",
                  { $ifNull: ["$inventory.lowStockLimit", 5] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $addFields: { name: { $ifNull: ["$name", "Unknown"] } } },
    { $sort: { profit: -1 } },
  ]);

  setCache(ANALYTICS_CACHE_KEY, stats, ANALYTICS_TTL);
  return stats;
};
