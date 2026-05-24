const mongoose = require("mongoose");

const stockLedgerSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    type: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    
    source: {
      type: String,
      enum: [
        "ORDER",
        "ORDER_CANCEL",
        "ORDER_DELETE",
        "PRODUCTION",
        "MANUAL",
        "ADJUSTMENT",
      ],
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
  
  { timestamps: true }
);


stockLedgerSchema.index({ product: 1, createdAt: -1 });

module.exports = mongoose.model("StockLedger", stockLedgerSchema);