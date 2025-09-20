const express = require("express");
const { body, validationResult } = require("express-validator");
const { supabaseAdmin } = require("../config/database");
const { authenticateToken, optionalAuth } = require("../middleware/auth");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { getUserData } = require("../config/clerk");

const router = express.Router();

const validateProfileUpdate = [
  body("username")
    .optional()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username must be 3-30 characters and contain only letters, numbers, and underscores"),
];

/**
 * @swagger
 * /api/auth/sync:
 *   post:
 *     summary: Sync user with Clerk
 *     description: Create or update user record in database based on Clerk authentication
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User synced successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to sync user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/sync",
  authenticateToken,
  asyncHandler(async (req, res) => {
    // User is already authenticated and created/updated by middleware
    res.json({
      success: true,
      message: "User synced successfully",
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          username: req.user.username,
          created_at: req.user.created_at,
        },
      },
    });
  })
);

/**
 * @swagger
 * /api/auth/status:
 *   get:
 *     summary: Check authentication status
 *     description: Check if user is authenticated and get user info
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authentication status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     authenticated:
 *                       type: boolean
 *                       example: true
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 data:
 *                   type: object
 *                   properties:
 *                     authenticated:
 *                       type: boolean
 *                       example: false
 */
router.get(
  "/status",
  optionalAuth,
  asyncHandler(async (req, res) => {
    if (req.user) {
      res.json({
        success: true,
        data: {
          authenticated: true,
          user: {
            id: req.user.id,
            email: req.user.email,
            username: req.user.username,
            created_at: req.user.created_at,
          },
        },
      });
    } else {
      res.json({
        success: true,
        data: {
          authenticated: false,
        },
      });
    }
  })
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logout user (handled by Clerk on frontend)
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Logout successful"
 */
router.post("/logout", (req, res) => {
  // Clerk handles logout on the frontend
  res.json({
    success: true,
    message: "Logout successful",
  });
});

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Get current user profile
 *     description: Retrieve the current authenticated user's profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  "/profile",
  authenticateToken,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          email: req.user.email,
          username: req.user.username,
          created_at: req.user.created_at,
        },
      },
    });
  })
);

/**
 * @swagger
 * /api/auth/profile:
 *   put:
 *     summary: Update user profile
 *     description: Update the current authenticated user's profile information
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: "newusername"
 *                 description: New username (3-30 characters, alphanumeric and underscores only)
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Profile updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *       400:
 *         description: Validation failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Username already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/profile",
  authenticateToken,
  validateProfileUpdate,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400);
    }

    const { username } = req.body;
    const userId = req.user.id;

    // Check if username is being updated and if it's already taken
    if (username && username !== req.user.username) {
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("username", username)
        .neq("id", userId)
        .single();

      if (existingUser) {
        throw new AppError("Username already exists", 409);
      }
    }

    // Update user profile
    const updateData = {};
    if (username) updateData.username = username;
    updateData.updated_at = new Date().toISOString();

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select("id, email, username, created_at")
      .single();

    if (updateError) {
      console.error("Profile update error:", updateError);
      throw new AppError("Failed to update profile", 500);
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: updatedUser,
      },
    });
  })
);



module.exports = router;
