const express = require("express");
const { Webhook } = require("svix");
const { supabaseAdmin } = require("../config/database");
const { asyncHandler, AppError } = require("../middleware/errorHandler");

const router = express.Router();

/**
 * @swagger
 * /api/webhooks/clerk:
 *   post:
 *     summary: Clerk webhook handler
 *     description: Handle Clerk webhook events for user synchronization
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 example: "user.created"
 *               data:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "user_123"
 *                   email_addresses:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         email_address:
 *                           type: string
 *                           example: "user@example.com"
 *                   username:
 *                     type: string
 *                     example: "username123"
 *     responses:
 *       200:
 *         description: Webhook processed successfully
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
 *                   example: "Webhook processed successfully"
 *       400:
 *         description: Invalid webhook payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid webhook signature
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/clerk",
  express.raw({ type: "application/json" }),
  asyncHandler(async (req, res) => {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      throw new AppError("Webhook secret not configured", 500);
    }

    // Get the headers
    const svix_id = req.headers["svix-id"];
    const svix_timestamp = req.headers["svix-timestamp"];
    const svix_signature = req.headers["svix-signature"];

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      throw new AppError("Missing required headers", 400);
    }

    // Get the body
    const payload = req.body;

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt;

    // Verify the payload with the headers
    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      });
    } catch (err) {
      console.error("Webhook verification failed:", err);
      throw new AppError("Invalid webhook signature", 401);
    }

    // Handle the webhook
    const { type, data } = evt;

    try {
      switch (type) {
        case "user.created":
          await handleUserCreated(data);
          break;
        case "user.updated":
          await handleUserUpdated(data);
          break;
        case "user.deleted":
          await handleUserDeleted(data);
          break;
        default:
          console.log(`Unhandled webhook type: ${type}`);
      }

      res.json({
        success: true,
        message: "Webhook processed successfully",
      });
    } catch (error) {
      console.error("Webhook processing error:", error);
      throw new AppError("Failed to process webhook", 500);
    }
  })
);

async function handleUserCreated(userData) {
  const userId = userData.id;
  const email = userData.email_addresses?.[0]?.email_address;
  const username = userData.username || email?.split('@')[0] || 'user';

  if (!email) {
    console.error("No email found for user:", userId);
    return;
  }

  try {
    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", userId)
      .single();

    if (existingUser) {
      console.log("User already exists:", userId);
      return;
    }

    // Create user in database
    const { error } = await supabaseAdmin
      .from("users")
      .insert([{
        id: userId,
        email: email,
        username: username,
        created_at: new Date().toISOString(),
      }]);

    if (error) {
      console.error("Error creating user:", error);
      throw error;
    }

    console.log("User created successfully:", userId);
  } catch (error) {
    console.error("Failed to create user:", error);
    throw error;
  }
}

async function handleUserUpdated(userData) {
  const userId = userData.id;
  const email = userData.email_addresses?.[0]?.email_address;
  const username = userData.username || email?.split('@')[0];

  try {
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (email) updateData.email = email;
    if (username) updateData.username = username;

    const { error } = await supabaseAdmin
      .from("users")
      .update(updateData)
      .eq("id", userId);

    if (error) {
      console.error("Error updating user:", error);
      throw error;
    }

    console.log("User updated successfully:", userId);
  } catch (error) {
    console.error("Failed to update user:", error);
    throw error;
  }
}

async function handleUserDeleted(userData) {
  const userId = userData.id;

  try {
    // Delete user and all related data (cascade will handle related records)
    const { error } = await supabaseAdmin
      .from("users")
      .delete()
      .eq("id", userId);

    if (error) {
      console.error("Error deleting user:", error);
      throw error;
    }

    console.log("User deleted successfully:", userId);
  } catch (error) {
    console.error("Failed to delete user:", error);
    throw error;
  }
}

module.exports = router;
