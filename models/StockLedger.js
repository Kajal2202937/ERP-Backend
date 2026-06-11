const mongoose = require("mongoose");

const stockLedgerSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },

    type: {
      type: String,
      enum: {
        values: ["IN", "OUT"],
        message: "Type must be IN or OUT",
      },
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
    },

    source: {
      type: String,
      enum: {
        values: [
          "ORDER",
          "ORDER_CANCEL",
          "ORDER_DELETE",
          "PRODUCTION",
          "PRODUCTION_DELETE",
          "MANUAL",
          "ADJUSTMENT",
        ],
        message: "Invalid stock movement source",
      },
      required: true,
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    costPrice: {
      type: Number,
      default: 0,
    },

    before: {
      type: Number,
      default: 0,
    },

    after: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true, versionKey: false },
);

stockLedgerSchema.index({ product: 1, createdAt: -1 });

stockLedgerSchema.index({ type: 1, createdAt: -1 });

stockLedgerSchema.index({ source: 1, createdAt: -1 });

stockLedgerSchema.index({ product: 1, type: 1, createdAt: -1 });

stockLedgerSchema.index({ referenceId: 1 });

module.exports = mongoose.model("StockLedger", stockLedgerSchema);
