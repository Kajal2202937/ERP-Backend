const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
    },

    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    lowStockLimit: {
      type: Number,
      default: 5,
    },

    location: {
      type: String,
      default: "Main Warehouse",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    archived: { 
      type: Boolean,
      default: false,
    },

    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Inventory", inventorySchema);