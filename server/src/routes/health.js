const express = require("express");
const { supabase } = require("../config/database");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

/**
 * @swagger
 * /healthz:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API and database connection
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 commit:
 *                   type: string
 *                   example: "production"
 *                 environment:
 *                   type: string
 *                   example: "production"
 *                 uptime:
 *                   type: number
 *                   example: 123.456
 *                 memory:
 *                   type: object
 *                 database:
 *                   type: string
 *                   example: "healthy"
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 database:
 *                   type: string
 *                   example: "error"
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    let dbStatus = "healthy";
    try {
      const { error } = await supabase.from("users").select("id").limit(1);
      if (error && error.code !== "PGRST116") dbStatus = "error";
    } catch {
      dbStatus = "error";
    }
    res.status(dbStatus === "healthy" ? 200 : 503).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || "1.0.0",
      commit: process.env.COMMIT_HASH || "development",
      environment: process.env.NODE_ENV || "development",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: dbStatus,
    });
  })
);

module.exports = router;
