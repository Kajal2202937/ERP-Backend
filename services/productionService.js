const mongoose = require("mongoose");
const Production = require("../models/Production");
const { updateStock } = require("./stockService");
const AppError = require("../utils/AppError");

exports.createProduction = async (data) => {
  if (!data.product || !data.quantityProduced) {
    throw new AppError("Product and quantity are required", 400);
  }
  if (data.quantityProduced <= 0) {
    throw new AppError("Quantity must be greater than 0", 400);
  }
  if (!mongoose.Types.ObjectId.isValid(data.product)) {
    throw new AppError("Invalid product ID", 400);
  }

  const production = await Production.create({
    ...data,
    statusHistory: [{ status: "started", changedAt: new Date() }],
  });

  return production;
};

exports.getProductions = async (query = {}) => {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 1000);
  const skip = (page - 1) * limit;
  const search = query.search?.trim();
  const status = query.status?.trim() || null;

  const earlyMatch = {};
  if (status) earlyMatch.status = status;

  const pipeline = [
    ...(Object.keys(earlyMatch).length ? [{ $match: earlyMatch }] : []),

    {
      $lookup: {
        from: "products",
        localField: "product",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },

    ...(search
      ? [{ $match: { "product.name": { $regex: search, $options: "i" } } }]
      : []),

    {
      $facet: {
        data: [
          { $sort: { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              product: { _id: "$product._id", name: "$product.name" },
              quantityProduced: 1,
              status: 1,
              statusHistory: 1,
              notes: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ],
        meta: [{ $count: "total" }],
      },
    },
  ];

  const [result] = await Production.aggregate(pipeline);

  const data = result?.data || [];
  const total = result?.meta?.[0]?.total || 0;
  const pages = Math.ceil(total / limit) || 1;

  return { data, total, page, pages };
};

exports.updateProduction = async (id, data) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid production ID", 400);
  }

  const old = await Production.findById(id);
  if (!old) throw new AppError("Production not found", 404);

  const allowedStatus = ["started", "in-progress", "completed"];
  if (data.status && !allowedStatus.includes(data.status)) {
    throw new AppError(
      `Invalid status. Must be one of: ${allowedStatus.join(", ")}`,
      400,
    );
  }

  if (data.status === "completed" && old.status === "completed") {
    throw new AppError("Production is already completed", 400);
  }

  const updated = await Production.findByIdAndUpdate(id, data, { new: true });

  if (data.status && data.status !== old.status) {
    updated.statusHistory.push({
      status: data.status,
      changedAt: new Date(),
    });
    await updated.save();
  }

  if (old.status !== "completed" && updated.status === "completed") {
    await updateStock({
      productId: updated.product,
      quantity: updated.quantityProduced,
      type: "IN",
      source: "PRODUCTION",
      referenceId: updated._id,
    });
  }

  return updated;
};

exports.deleteProduction = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError("Invalid production ID", 400);
  }

  const prod = await Production.findById(id);
  if (!prod) throw new AppError("Production not found", 404);

  if (prod.status === "completed") {
    await updateStock({
      productId: prod.product,
      quantity: prod.quantityProduced,
      type: "OUT",
      source: "PRODUCTION_DELETE",
      referenceId: prod._id,
    });
  }

  return await Production.findByIdAndDelete(id);
};
