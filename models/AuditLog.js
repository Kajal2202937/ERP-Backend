const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",

      default: null,
    },

    userEmail: {
      type: String,
      default: "system",
    },

    userRole: {
      type: String,
      default: "system",
    },

    action: {
      type: String,
      enum: [
        "CREATE",
        "UPDATE",
        "DELETE",
        "LOGIN",
        "LOGOUT",
        "IMPORT",
        "EXPORT",
        "STATUS_CHANGE",
      ],
      required: true,
    },

    resource: {
      type: String,
      enum: [
        "User",
        "Order",
        "Product",
        "Supplier",
        "Inventory",
        "Production",
        "Ticket",
        "Auth",
      ],
      required: true,
    },

    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    summary: {
      type: String,
      maxlength: 500,
      default: "",
    },

    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    ip: {
      type: String,
      default: "",
    },

    userAgent: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

auditLogSchema.index({ userId: 1, createdAt: -1 });

auditLogSchema.index({ resource: 1, resourceId: 1, createdAt: -1 });

auditLogSchema.index({ action: 1, createdAt: -1 });

auditLogSchema.index({ createdAt: -1 });

auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60, name: "ttl_1year" },
);

module.exports = mongoose.model("AuditLog", auditLogSchema);
