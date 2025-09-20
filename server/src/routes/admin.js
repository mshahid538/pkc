const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const { supabaseAdmin, setUserContext } = require("../config/database");
const { AppError } = require("../utils/logger");

const router = express.Router();

// Apply authentication to all admin routes
router.use(authenticateToken);

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: Get system logs (last 20 ingestions)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [ingestion, error]
 *                       message:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [success, error]
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get("/logs", async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Set user context for RLS
    await setUserContext(userId);

    // Get last 20 log entries
    // For now, we'll create mock logs since we don't have a logs table yet
    const mockLogs = [
      {
        id: "log_1",
        type: "ingestion",
        message: "File 'document.pdf' processed successfully",
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
        status: "success"
      },
      {
        id: "log_2", 
        type: "ingestion",
        message: "File 'report.xlsx' processed successfully",
        timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), // 10 minutes ago
        status: "success"
      },
      {
        id: "log_3",
        type: "error",
        message: "Failed to process file 'corrupted.pdf' - invalid format",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
        status: "error"
      },
      {
        id: "log_4",
        type: "ingestion", 
        message: "File 'notes.txt' processed successfully",
        timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(), // 20 minutes ago
        status: "success"
      }
    ];

    res.json({
      success: true,
      data: mockLogs
    });

  } catch (error) {
    console.error("Admin logs error:", error);
    throw new AppError("Failed to fetch system logs", 500);
  }
});

/**
 * @swagger
 * /api/admin/summaries/{summaryId}:
 *   put:
 *     summary: Update a summary
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: summaryId
 *         required: true
 *         schema:
 *           type: string
 *         description: Summary ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 description: New summary content
 *     responses:
 *       200:
 *         description: Summary updated successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Summary not found
 *       500:
 *         description: Internal server error
 */
router.put("/summaries/:summaryId", async (req, res) => {
  try {
    const userId = req.user.id;
    const { summaryId } = req.params;
    const { content } = req.body;

    if (!content) {
      throw new AppError("Summary content is required", 400);
    }

    // Set user context for RLS
    await setUserContext(userId);

    // Update the summary
    const { data: summary, error } = await supabaseAdmin
      .from("summaries")
      .update({
        short_summary: content,
        updated_at: new Date().toISOString()
      })
      .eq("id", summaryId)
      .select()
      .single();

    if (error) {
      console.error("Summary update error:", error);
      throw new AppError("Failed to update summary", 500);
    }

    if (!summary) {
      throw new AppError("Summary not found", 404);
    }

    res.json({
      success: true,
      data: summary,
      message: "Summary updated successfully"
    });

  } catch (error) {
    console.error("Update summary error:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to update summary", 500);
  }
});

/**
 * @swagger
 * /api/admin/tags:
 *   get:
 *     summary: Get all tags for the user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tags retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get("/tags", async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Set user context for RLS
    await setUserContext(userId);

    // Get user's tags
    const { data: tags, error } = await supabaseAdmin
      .from("tags")
      .select("id, name")
      .eq("user_id", userId)
      .order("name");

    if (error) {
      console.error("Tags fetch error:", error);
      throw new AppError("Failed to fetch tags", 500);
    }

    res.json({
      success: true,
      data: tags || []
    });

  } catch (error) {
    console.error("Get tags error:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to fetch tags", 500);
  }
});

/**
 * @swagger
 * /api/admin/tags:
 *   post:
 *     summary: Create a new tag
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Tag name
 *     responses:
 *       201:
 *         description: Tag created successfully
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.post("/tags", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name) {
      throw new AppError("Tag name is required", 400);
    }

    // Set user context for RLS
    await setUserContext(userId);

    // Create the tag
    const { data: tag, error } = await supabaseAdmin
      .from("tags")
      .insert([{
        user_id: userId,
        name: name.trim()
      }])
      .select()
      .single();

    if (error) {
      console.error("Tag creation error:", error);
      if (error.code === "23505") { // Unique constraint violation
        throw new AppError("Tag already exists", 409);
      }
      throw new AppError("Failed to create tag", 500);
    }

    res.status(201).json({
      success: true,
      data: tag,
      message: "Tag created successfully"
    });

  } catch (error) {
    console.error("Create tag error:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to create tag", 500);
  }
});

/**
 * @swagger
 * /api/admin/tags/{tagId}:
 *   delete:
 *     summary: Delete a tag
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: string
 *         description: Tag ID
 *     responses:
 *       200:
 *         description: Tag deleted successfully
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Tag not found
 *       500:
 *         description: Internal server error
 */
router.delete("/tags/:tagId", async (req, res) => {
  try {
    const userId = req.user.id;
    const { tagId } = req.params;

    // Set user context for RLS
    await setUserContext(userId);

    // Delete the tag
    const { error } = await supabaseAdmin
      .from("tags")
      .delete()
      .eq("id", tagId)
      .eq("user_id", userId);

    if (error) {
      console.error("Tag deletion error:", error);
      throw new AppError("Failed to delete tag", 500);
    }

    res.json({
      success: true,
      message: "Tag deleted successfully"
    });

  } catch (error) {
    console.error("Delete tag error:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to delete tag", 500);
  }
});

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalThreads:
 *                       type: number
 *                     totalFiles:
 *                       type: number
 *                     totalMessages:
 *                       type: number
 *                     totalTags:
 *                       type: number
 *                     recentActivity:
 *                       type: array
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Internal server error
 */
router.get("/stats", async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Set user context for RLS
    await setUserContext(userId);

    // Get statistics
    const [threadsResult, filesResult, messagesResult, tagsResult] = await Promise.all([
      supabaseAdmin.from("threads").select("id", { count: "exact" }).eq("user_id", userId),
      supabaseAdmin.from("files").select("id", { count: "exact" }).eq("user_id", userId),
      supabaseAdmin.from("messages").select("id", { count: "exact" }),
      supabaseAdmin.from("tags").select("id", { count: "exact" }).eq("user_id", userId)
    ]);

    const stats = {
      totalThreads: threadsResult.count || 0,
      totalFiles: filesResult.count || 0,
      totalMessages: messagesResult.count || 0,
      totalTags: tagsResult.count || 0,
      recentActivity: [
        {
          type: "thread_created",
          message: "New thread created",
          timestamp: new Date().toISOString()
        },
        {
          type: "file_uploaded",
          message: "File uploaded successfully",
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        }
      ]
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error("Get stats error:", error);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("Failed to fetch statistics", 500);
  }
});

module.exports = router;
