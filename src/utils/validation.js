const { body, param, query, validationResult } = require("express-validator");

const commonValidations = {
  email: body("email")
    .isEmail()
    .normalizeEmail()
    .withMessage("Please provide a valid email address"),

  password: body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),

  username: body("username")
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "Username must be 3-30 characters and contain only letters, numbers, and underscores"
    ),

  message: body("message")
    .notEmpty()
    .trim()
    .isLength({ max: 10000 })
    .withMessage("Message must not be empty and less than 10,000 characters"),

  threadId: body("threadId")
    .optional({ checkFalsy: true })
    .isUUID()
    .withMessage("Thread ID must be a valid UUID"),

  fileType: (allowedTypes = ["pdf", "txt", "md"]) => {
    return (req, res, next) => {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file provided",
        });
      }

      const fileExtension = req.file.originalname
        .split(".")
        .pop()
        .toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        return res.status(400).json({
          success: false,
          message: `File type .${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(
            ", "
          )}`,
        });
      }

      next();
    };
  },

  pagination: [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
  ],

  uuidParam: (paramName) =>
    param(paramName).isUUID().withMessage(`${paramName} must be a valid UUID`),
};

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

const sanitize = {
  html: (text) => {
    if (typeof text !== "string") return text;
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<[^>]*>/g, "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  },

  filename: (filename) => {
    if (typeof filename !== "string") return filename;
    return filename
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_")
      .substring(0, 255);
  },

  metadata: (metadata) => {
    if (typeof metadata === "string") {
      try {
        metadata = JSON.parse(metadata);
      } catch (error) {
        return {};
      }
    }

    if (typeof metadata !== "object" || metadata === null) {
      return {};
    }

    const safeMetadata = { ...metadata };
    delete safeMetadata.__proto__;
    delete safeMetadata.constructor;

    return safeMetadata;
  },
};

const validateRateLimit = (req, res, next) => {
  const rateLimitInfo = req.rateLimit;
  if (rateLimitInfo && rateLimitInfo.remaining === 0) {
    return res.status(429).json({
      success: false,
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: Math.ceil(rateLimitInfo.resetTime / 1000),
    });
  }
  next();
};

module.exports = {
  commonValidations,
  validate,
  sanitize,
  validateRateLimit,
};
