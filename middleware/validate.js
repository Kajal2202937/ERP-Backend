const { ZodError } = require("zod");
const AppError = require("../utils/AppError");

/**
 * Validate req.body against a Zod schema.
 * @param {import("zod").ZodSchema} schema
 * @param {"body"|"query"|"params"} source - which part of req to validate (default: "body")
 */
const validate = (schema, source = "body") => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join(".") || "input",
        message: e.message,
      }));

      return res.status(400).json({
        success: false,
        message: errors[0]?.message || "Validation failed",
        errors,
      });
    }

    req[source] = result.data;
    next();
  };
};

const validateQuery = (schema) => validate(schema, "query");

const validateParams = (schema) => validate(schema, "params");

module.exports = { validate, validateQuery, validateParams };
