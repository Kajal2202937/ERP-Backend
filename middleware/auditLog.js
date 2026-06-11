const AuditLog = require("../models/AuditLog");

/**
 * Write an audit log entry. Fire-and-forget — never throws.
 *
 * @param {Object} payload
 * @param {string}  payload.action       - CREATE | UPDATE | DELETE | LOGIN | LOGOUT | IMPORT | EXPORT | STATUS_CHANGE
 * @param {string}  payload.resource     - User | Order | Product | Supplier | Inventory | Production | Ticket | Auth
 * @param {Object}  [payload.user]       - req.user (or null for system actions)
 * @param {string}  [payload.resourceId] - MongoDB _id of the affected document
 * @param {string}  [payload.summary]    - Human-readable description
 * @param {Object}  [payload.before]     - State before change (for UPDATE/DELETE)
 * @param {Object}  [payload.after]      - State after change (for CREATE/UPDATE)
 * @param {string}  [payload.ip]         - Request IP
 * @param {string}  [payload.userAgent]  - Request user-agent
 */
const writeAuditLog = (payload) => {
  AuditLog.create({
    userId: payload.user?._id || null,
    userEmail: payload.user?.email || "system",
    userRole: payload.user?.role || "system",
    action: payload.action,
    resource: payload.resource,
    resourceId: payload.resourceId || null,
    summary: payload.summary || "",
    before: payload.before || null,
    after: payload.after || null,
    ip: payload.ip || "",
    userAgent: payload.userAgent || "",
  }).catch((err) => {
    console.error("[AuditLog] Write failed:", err.message);
  });
};

/**
 * Extract client IP from request, handling proxies.
 */
const getIP = (req) =>
  req.ip ||
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.connection?.remoteAddress ||
  "";

/**
 * Express middleware that logs AFTER the route handler responds successfully.
 * Uses res.on("finish") so it only logs if the handler didn't throw.
 *
 * Usage:
 *   router.post("/", protect, auditMiddleware("CREATE", "Product"), createProduct);
 *   router.delete("/:id", protect, auditMiddleware("DELETE", "Product"), deleteProduct);
 *
 * @param {string}   action       - The action enum value
 * @param {string}   resource     - The resource name
 * @param {Function} [getSummary] - Optional fn(req, res) => string for custom summary
 */
const auditMiddleware = (action, resource, getSummary) => {
  return (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;

      const summary = getSummary
        ? getSummary(req, res)
        : `${action} on ${resource}${req.params?.id ? ` (${req.params.id})` : ""}`;

      writeAuditLog({
        action,
        resource,
        user: req.user,
        resourceId: req.params?.id || res.locals?.resourceId || null,
        summary,
        after: res.locals?.auditAfter || null,
        before: res.locals?.auditBefore || null,
        ip: getIP(req),
        userAgent: req.headers["user-agent"] || "",
      });
    });

    next();
  };
};

module.exports = { writeAuditLog, auditMiddleware, getIP };
