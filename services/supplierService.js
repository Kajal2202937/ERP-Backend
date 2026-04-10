const Supplier = require("../models/Supplier");

// CREATE
exports.createSupplier = async (data) => {
  const exists = await Supplier.findOne({ email: data.email });
  if (exists) throw new Error("Supplier already exists");

  return await Supplier.create(data);
};

// GET ALL
exports.getSuppliers = async ({ page = 1, limit = 10, search = "" }) => {
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

  const data = await Supplier.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  const total = await Supplier.countDocuments(query);

  return {
    data,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
  };
};

// UPDATE
exports.updateSupplier = async (id, data) => {
  const supplier = await Supplier.findById(id);
  if (!supplier) throw new Error("Supplier not found");

  if (data.email && data.email !== supplier.email) {
    const exists = await Supplier.findOne({ email: data.email });
    if (exists) throw new Error("Email already exists");
  }

  return await Supplier.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });
};

// DELETE
exports.deleteSupplier = async (id) => {
  return await Supplier.findByIdAndDelete(id);
};

// BULK DELETE
exports.bulkDelete = async (ids) => {
  return await Supplier.deleteMany({ _id: { $in: ids } });
};

// TOGGLE STATUS
exports.toggleStatus = async (id) => {
  const supplier = await Supplier.findById(id);
  if (!supplier) throw new Error("Supplier not found");

  supplier.active = !supplier.active;
  return await supplier.save();
};