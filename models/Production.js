const mongoose = require("mongoose");

const productionSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },

    quantityProduced: {
      type: Number,
      required: [true, "Quantity produced is required"],
      min: [1, "Quantity must be at least 1"],
    },

    productionDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: {
        values: ["started", "in-progress", "completed"],
        message: "Status must be started, in-progress, or completed",
      },
      default: "started",
    },

    statusHistory: [
      {
        _id: false,
        status: {
          type: String,
          enum: ["started", "in-progress", "completed"],
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

productionSchema.pre("save", function () {
  if (this.isNew || this.isModified("status")) {
    this.statusHistory.push({ status: this.status, changedAt: new Date() });
  }
});

productionSchema.index({ product: 1, createdAt: -1 });

productionSchema.index({ status: 1, createdAt: -1 });

productionSchema.index({ productionDate: -1 });

productionSchema.index({ product: 1, status: 1 });

module.exports = mongoose.model("Production", productionSchema);
