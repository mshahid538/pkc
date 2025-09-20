const errorHandler = (err, req, res, next) => {
  console.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  } else if (err.code === "23505") {
    statusCode = 409;
    message = "Resource already exists";
  } else if (err.code === "23503") {
    statusCode = 400;
    message = "Referenced resource does not exist";
  } else if (err.code === "PGRST116") {
    statusCode = 500;
    message = "Database table not found";
  } else if (err.code === "LIMIT_FILE_SIZE") {
    statusCode = 413;
    message = "File too large";
  } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
    statusCode = 400;
    message = "Unexpected file field";
  } else if (err.code === "LIMIT_FILE_COUNT") {
    statusCode = 400;
    message = "Too many files";
  } else if (err.code === "LIMIT_FIELD_KEY") {
    statusCode = 400;
    message = "Field name too long";
  } else if (err.code === "LIMIT_FIELD_VALUE") {
    statusCode = 400;
    message = "Field value too long";
  } else if (err.code === "LIMIT_FIELD_COUNT") {
    statusCode = 400;
    message = "Too many fields";
  } else if (err.code === "LIMIT_REACHED") {
    statusCode = 429;
    message = "Rate limit exceeded";
  }

  if (process.env.NODE_ENV === "production" && statusCode === 500) {
    message = "Internal Server Error";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && {
      error: err.message,
      stack: err.stack,
    }),
  });
};

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  AppError,
  asyncHandler,
};
