const mongoose = require("mongoose");

const DEFAULT_PERMISSIONS = {
  admin: [
    "user:create",
    "user:read",
    "user:update",
    "user:delete",
    "product:create",
    "product:read",
    "product:update",
    "product:delete",
    "order:create",
    "order:read",
    "order:update",
    "order:delete",
    "inventory:create",
    "inventory:read",
    "inventory:update",
    "inventory:delete",
    "supplier:create",
    "supplier:read",
    "supplier:update",
    "supplier:delete",
    "production:create",
    "production:read",
    "production:update",
    "production:delete",
    "report:read",
    "report:export",
    "ticket:read",
    "ticket:update",
    "ticket:delete",
    "settings:read",
    "settings:update",
  ],
  manager: [
    "product:create",
    "product:read",
    "product:update",
    "order:create",
    "order:read",
    "order:update",
    "inventory:read",
    "inventory:update",
    "supplier:read",
    "supplier:update",
    "production:read",
    "production:update",
    "report:read",
    "ticket:read",
  ],
  staff: [
    "product:read",
    "order:read",
    "order:create",
    "inventory:read",
    "supplier:read",
    "production:read",
    "ticket:read",
  ],
  employee: ["product:read", "order:read", "inventory:read"],
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [3, "Name must be at least 3 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10}$/, "Phone number must be exactly 10 digits"],
    },

    role: {
      type: String,
      enum: {
        values: ["admin", "manager", "staff", "employee"],
        message: "Role must be admin, manager, staff, or employee",
      },
      default: "staff",
    },

    permissions: {
      type: [String],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

userSchema.pre("save", function (next) {
  if (this.isModified("status")) {
    this.isActive = this.status === "active";
  }
  if (this.isModified("isActive")) {
    this.status = this.isActive ? "active" : "inactive";
  }

  if (
    (this.isNew || this.isModified("role")) &&
    (!this.permissions || this.permissions.length === 0)
  ) {
    this.permissions = DEFAULT_PERMISSIONS[this.role] || [];
  }

});

userSchema.methods.hasPermission = function (permission) {
  return this.permissions.includes(permission);
};

userSchema.methods.toPublicJSON = function () {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    status: this.status,
    isActive: this.isActive,
    permissions: this.permissions,
    createdBy: this.createdBy,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

userSchema.statics.defaultPermissions = function (role) {
  return DEFAULT_PERMISSIONS[role] || [];
};

module.exports = mongoose.model("User", userSchema);
