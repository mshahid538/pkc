const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

require("dotenv").config();

const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const uploadRoutes = require("./routes/upload");
const healthRoutes = require("./routes/health");
const { errorHandler } = require("./middleware/errorHandler");
const { authenticateToken } = require("./middleware/auth");

const swaggerUi = require("swagger-ui-express");
const swaggerSpecs = require("./config/swagger");
const cookieParser = require("cookie-parser");

const app = express();

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGINS?.split(",")
        : true,
    credentials: true,
  })
);

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use(morgan("combined"));
app.use(compression());
app.use(cookieParser());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/healthz", healthRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/chat", authenticateToken, chatRoutes);
app.use("/api/upload", authenticateToken, uploadRoutes);

app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Endpoint not found",
    path: req.originalUrl,
  });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`PKC Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Health check: http://localhost:${PORT}/healthz`);
});

module.exports = app;
