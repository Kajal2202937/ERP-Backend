const mongoose = require("mongoose");

const getNextOrderNumber = async () => {
  const year = new Date().getFullYear();
  const Counter = mongoose.connection.collection("counters");

  const result = await Counter.findOneAndUpdate(
    { _id: `orderNumber_${year}` },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  const seq = String(result.seq).padStart(5, "0");
  return `ORD-${year}-${seq}`;
};

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      required: true,
    },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    changedAt: { type: Date, default: Date.now },
    note: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, sparse: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "createdBy is required"],
    },

    customer: {
      name: { type: String, trim: true, default: "" },
      email: { type: String, trim: true, lowercase: true, default: "" },
      phone: { type: String, trim: true, default: "" },
      address: { type: String, trim: true, default: "" },
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number",
      },
    },

    price: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0, max: 100 },
    totalPrice: { type: Number, required: true, min: 0 },

    status: {
      type: String,
      enum: {
        values: ["pending", "completed", "cancelled"],
        message: "Status must be pending, completed, or cancelled",
      },
      default: "pending",
    },

    completedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
    statusHistory: { type: [statusHistorySchema], default: [] },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: "",
    },

    cancellationReason: { type: String, trim: true, default: "" },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

orderSchema.virtual("profit").get(function () {
  return parseFloat(((this.price - this.costPrice) * this.quantity).toFixed(2));
});

orderSchema.virtual("marginPercent").get(function () {
  if (!this.price || this.price === 0) return 0;
  return parseFloat(
    (((this.price - this.costPrice) / this.price) * 100).toFixed(2),
  );
});

orderSchema.pre("save", async function () {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = await getNextOrderNumber();
  }
  if (this.isModified("status")) {
    if (this.status === "completed" && !this.completedAt) {
      this.completedAt = new Date();
    }
    if (this.status === "cancelled" && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
  }
});

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

orderSchema.index({ status: 1, completedAt: -1 });
orderSchema.index({ product: 1, createdAt: -1 });
orderSchema.index({ createdBy: 1, createdAt: -1 });
orderSchema.index({ "customer.email": 1 });
orderSchema.index({ completedAt: -1 });

module.exports = mongoose.model("Order", orderSchema);
