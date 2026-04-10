const Production = require("../models/Production");
const Inventory = require("../models/Inventory");

// ---------------- CREATE ----------------
exports.createProduction = async (data) => {
  if (!data.product || !data.quantityProduced) {
    throw new Error("Product and quantity are required");
  }

  if (data.quantityProduced <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  const production = await Production.create({
    ...data,
    statusHistory: [
      { status: "started", changedAt: new Date() },
    ],
  });

  return production;
};

// ---------------- GET ALL ----------------
exports.getProductions = async () => {
  return await Production.find()
    .populate("product", "name")
    .sort({ createdAt: -1 });
};

// ---------------- UPDATE ----------------
exports.updateProduction = async (id, data) => {
  const old = await Production.findById(id);
  if (!old) throw new Error("Production not found");

  const allowedStatus = ["started", "in-progress", "completed"];

  if (data.status && !allowedStatus.includes(data.status)) {
    throw new Error("Invalid status");
  }

  const updated = await Production.findByIdAndUpdate(id, data, {
    new: true,
  });

  // ---------------- STATUS HISTORY ----------------
  if (data.status && data.status !== old.status) {
    updated.statusHistory.push({
      status: data.status,
      changedAt: new Date(),
    });

    await updated.save();
  }

  // ---------------- INVENTORY UPDATE (SAFE) ----------------
  const wasCompleted = old.status === "completed";
  const nowCompleted = updated.status === "completed";

  if (!wasCompleted && nowCompleted) {
    await Inventory.findOneAndUpdate(
      { product: updated.product },
      {
        $inc: { quantity: updated.quantityProduced },
      },
      { upsert: true, new: true }
    );
  }

  return updated;
};

// ---------------- DELETE (WITH ROLLBACK) ----------------
exports.deleteProduction = async (id) => {
  const prod = await Production.findById(id);

  if (!prod) throw new Error("Production not found");

  // rollback inventory if already completed
  if (prod.status === "completed") {
    await Inventory.findOneAndUpdate(
      { product: prod.product },
      {
        $inc: { quantity: -prod.quantityProduced },
      }
    );
  }

  return await Production.findByIdAndDelete(id);
};