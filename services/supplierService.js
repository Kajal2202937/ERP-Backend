const Supplier = require("../models/Supplier");
const Inventory = require("../models/Inventory");
const Product = require("../models/Product");

exports.createSupplier = async (data) => {
  const exists = await Supplier.findOne({ email: data.email });
  if (exists) throw new Error("Supplier already exists");

  return await Supplier.create(data);
};

exports.getSuppliers = async ({ page = 1, limit = 10, search = "" }) => {
  page = Math.max(parseInt(page) || 1, 1);
  limit = Math.max(parseInt(limit) || 10, 1);

  const query = search
    ? {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
        ],
      }
    : {};

  const skip = (page - 1) * limit;

  const suppliers = await Supplier.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Supplier.countDocuments(query);

  const activeCount = await Supplier.countDocuments({
    ...query,
    active: true,
  });

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

    {
      $lookup: {
        from: "suppliers",
        localField: "_id",
        foreignField: "_id",
        as: "supplier",
      },
    },

    { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },

    {
      $addFields: {
        name: "$supplier.name",
        company: "$supplier.company",
      },
    },
  ]);

  const statsMap = {};
  stats.forEach((s) => {
    if (s._id) {
      statsMap[s._id.toString()] = s;
    }
  });

  const finalData = suppliers.map((s) => {
    const st = statsMap[s._id.toString()] || {};

    return {
      ...s,
      stats: {
        count: st.count || 0,
        qty: st.qty || 0,
        value: st.value || 0,
        costValue: st.costValue || 0,
        profit: st.profit || 0,
        lowStock: st.lowStock || 0,
        outOfStock: st.outOfStock || 0,
      },
    };
  });

  const productCount = stats.reduce((sum, s) => sum + (s.count || 0), 0);
  const stockValue = stats.reduce((sum, s) => sum + (s.costValue || 0), 0);

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
  return await Supplier.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};

exports.deleteSupplier = async (id) => {
  return await Supplier.findByIdAndDelete(id);
};

exports.bulkDelete = async (ids) => {
  return await Supplier.deleteMany({ _id: { $in: ids } });
};

exports.toggleStatus = async (id) => {
  const supplier = await Supplier.findById(id);

  if (!supplier) {
    throw new Error("Supplier not found");
  }

  supplier.active = !supplier.active;
  return await supplier.save();
};

exports.getSupplierAnalytics = async () => {
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

    {
      $addFields: {
        name: { $ifNull: ["$name", "Unknown"] },
      },
    },

    { $sort: { profit: -1 } },
  ]);

  return stats;
};
