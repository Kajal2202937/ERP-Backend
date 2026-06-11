const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [200, "Name cannot exceed 200 characters"],
    },

    sku: {
      type: String,
      unique: true,
      trim: true,
      sparse: true,
    },

    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },

    costPrice: {
      type: Number,
      required: [true, "Cost price is required"],
      min: [0, "Cost price cannot be negative"],
    },

    quantity: {
      type: Number,
      default: 0,
      min: [0, "Quantity cannot be negative"],
    },

    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "Status must be active or inactive",
      },
      default: "active",
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },
  },
  { timestamps: true, versionKey: false },
);

productSchema.index({ status: 1, createdAt: -1 });

productSchema.index({ category: 1, status: 1 });

productSchema.index({ supplier: 1, status: 1 });

productSchema.index({ price: 1 });

productSchema.index(
  { name: "text", sku: "text", description: "text" },
  {
    weights: { name: 10, sku: 8, description: 1 },
    name: "product_text_search",
  },
);

productSchema.index({ supplier: 1, category: 1 });

module.exports = mongoose.model("Product", productSchema);
