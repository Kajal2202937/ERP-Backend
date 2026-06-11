const asyncHandler = require("../middleware/asyncHandler");
const AppError = require("../utils/AppError");
const AuditLog = require("../models/AuditLog");

exports.getAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const filter = {};

  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.action) filter.action = req.query.action;
  if (req.query.resource) filter.resource = req.query.resource;
  if (req.query.resourceId) filter.resourceId = req.query.resourceId;

  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate && !isNaN(new Date(req.query.startDate))) {
      filter.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate && !isNaN(new Date(req.query.endDate))) {
      filter.createdAt.$lte = new Date(req.query.endDate);
    }
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: logs,
    total,
    page,
    pages: Math.ceil(total / limit) || 1,
  });
});

exports.getAuditLogById = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id)
    .populate("userId", "name email role")
    .lean();

  if (!log) throw new AppError("Audit log entry not found", 404);

  res.json({ success: true, data: log });
});
