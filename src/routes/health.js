const express = require("express");
const { supabase } = require("../config/database");
const { asyncHandler } = require("../middleware/errorHandler");

const router = express.Router();

// Health check
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
