const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    company: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },

    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: {
        values: ["active", "inactive"],
        message: "Status must be active or inactive",
      },
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

supplierSchema.virtual("isActive").get(function () {
  return this.status === "active";
});

supplierSchema.index({ status: 1, createdAt: -1 });

supplierSchema.index({ name: 1 });

supplierSchema.index({ email: 1, createdAt: -1 });

supplierSchema.index({ _id: 1, status: 1 });

module.exports = mongoose.model("Supplier", supplierSchema);
