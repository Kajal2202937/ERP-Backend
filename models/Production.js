const mongoose = require("mongoose");

const productionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantityProduced: {
      type: Number,
      required: true,
      min: 1,
    },

    productionDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["started", "in-progress", "completed"],
      default: "started",
    },

    statusHistory: [
      {
        status: String,
        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Production", productionSchema);