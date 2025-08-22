/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Create or continue conversation thread
 *     description: Create a new conversation or continue an existing one with a message
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 maxLength: 10000
 *                 example: "Hello, how are you?"
 *                 description: User message content
 *               threadId:
 *                 type: string
 *                 format: uuid
 *                 example: "123e4567-e89b-12d3-a456-426614174000"
 *                 description: Optional conversation ID to continue existing thread
 *     responses:
 *       200:
 *         description: Message sent successfully
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
 *                     threadId:
 *                       type: string
 *                       format: uuid
 *                       description: Conversation ID
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Message'
 *       400:
 *         description: Validation error
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
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const fs = require("fs");
const express = require("express");
const { body, validationResult } = require("express-validator");

const { supabase } = require("../config/database");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { getChatCompletion } = require("../utils/openai");

const router = express.Router();

// Validation middleware
const validateChatMessage = [
  body("message").notEmpty().trim(),
  body("threadId").optional().isUUID(),
];

// Create or continue conversation thread
router.post(
  "/",
  validateChatMessage,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400);
    }

    const { message, threadId } = req.body;
    const userId = req.user.id;

    let threadIdFinal = threadId;

    // If no threadId provided, create new thread
    if (!threadId) {
      const { data: newThread, error: createError } = await supabase
        .from("threads")
        .insert([
          {
            user_id: userId,
            title:
              message.substring(0, 100) + (message.length > 100 ? "..." : ""),
            created_at: new Date().toISOString(),
          },
        ])
        .select("id, title, created_at")
        .single();

      if (createError) {
        console.error("Thread creation error:", createError);
        throw new AppError("Failed to create thread", 500);
      }

      threadIdFinal = newThread.id;
    } else {
      // Verify thread belongs to user
      const { data: thread, error: findError } = await supabase
        .from("threads")
        .select("id, user_id")
        .eq("id", threadId)
        .eq("user_id", userId)
        .single();

      if (findError || !thread) {
        throw new AppError("Thread not found or access denied", 404);
      }
    }

    // Store user message
    const { data: userMessage, error: userMessageError } = await supabase
      .from("messages")
      .insert([
        {
          thread_id: threadIdFinal,
          role: "user",
          content: message,
          created_at: new Date().toISOString(),
        },
      ])
      .select("id, content, role, created_at")
      .single();

    if (userMessageError) {
      console.error("User message creation error:", userMessageError);
      throw new AppError("Failed to store user message", 500);
    }

    // Fetch last 10 messages for context (user and assistant)
    const { data: contextMessages, error: contextError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("thread_id", threadIdFinal)
      .order("created_at", { ascending: true })
      .limit(10);
    if (contextError) {
      console.error("Context fetch error:", contextError);
      throw new AppError("Failed to fetch conversation context", 500);
    }

    // RAG: Use precomputed file_chunks embeddings for semantic retrieval
    const { getEmbeddings, cosineSimilarity } = require("../utils/openai");
    let fileContext = "";
    const SIMILARITY_THRESHOLD = 0.8; // Only use chunks above this threshold for strict RAG
    try {
      // Get embedding for user question
      const [queryEmbedding] = await getEmbeddings([message]);
      // Query all file_chunks for this user (filename is not required, use chunk_text)
      const { data: chunks, error: chunkError } = await supabase
        .from("file_chunks")
        .select("chunk_text, embedding")
        .eq("user_id", userId);
      if (chunkError) throw chunkError;
      if (chunks && chunks.length) {
        // Compute similarity
        for (const chunk of chunks) {
          let embeddingB = chunk.embedding;
          if (typeof embeddingB === "string") {
            try {
              embeddingB = JSON.parse(embeddingB);
            } catch (e) {
              embeddingB = [];
            }
          }
          chunk.sim = cosineSimilarity(queryEmbedding, embeddingB);
        }
        // Sort by similarity and select top 5 chunks
        const topChunks = chunks.sort((a, b) => b.sim - a.sim).slice(0, 5);
        // Add logging for debugging
        const topChunkLog = topChunks.map((c) => ({
          sim: c.sim,
          text: c.chunk_text.slice(0, 100),
        }));
        console.log("[AI FILE CHUNKS TOP 5]", topChunkLog);
        // Only use chunks above the threshold
        const relevantChunks = topChunks.filter(
          (c) => c.sim >= SIMILARITY_THRESHOLD
        );
        if (relevantChunks.length) {
          fileContext = relevantChunks.map((c) => c.chunk_text).join("\n\n");
        } else {
          fileContext = "";
        }
        // Limit context to 8000 characters (about 2000 tokens)
        if (fileContext.length > 8000) fileContext = fileContext.slice(0, 8000);
      }
    } catch (e) {
      console.error("File context fetch error (RAG):", e);
    }

    // Fetch latest summary for this thread (if any)
    let summaryMessage = null;
    try {
      const { data: summaryRow } = await supabase
        .from("summaries")
        .select("short_summary, long_summary")
        .eq("thread_id", threadIdFinal)
        .single();
      if (summaryRow && summaryRow.long_summary) {
        summaryMessage = {
          role: "system",
          content: `Conversation summary: ${summaryRow.long_summary}`,
        };
      }
    } catch (e) {
      // ignore summary fetch errors
    }

    // Format messages for OpenAI
    let openaiMessages = [];
    const fallback = "I don't know based on the provided files.";
    // Helper: check if file context is meaningful (at least 10 words with 3+ alphabetic chars)
    function isMeaningfulContext(text) {
      if (!text) return false;
      const words = text.trim().split(/\s+/);
      const alphaWords = words.filter(
        (w) => (w.match(/[a-zA-Z]/g) || []).length >= 3
      );
      return alphaWords.length >= 10;
    }

    if (fileContext && isMeaningfulContext(fileContext)) {
      // If file context is found and meaningful, use strict RAG prompt
      console.log(
        "[AI FILE CONTEXT SENT TO OPENAI]",
        fileContext.slice(0, 500)
      );
      openaiMessages.push({
        role: "system",
        content:
          "You are an assistant for the Personal Knowledge Console (PKC). The user has uploaded the following files as their personal knowledge base.\n" +
          "You MUST answer ONLY using the provided file content below. If the answer is not found in the file, reply ONLY: 'I don't know based on the provided files.'\n" +
          "If you use information from the files, quote or reference the file content directly.\n" +
          "\n--- FILE CONTEXT START ---\n" +
          fileContext +
          "\n--- FILE CONTEXT END ---\n" +
          "\nUser question: " +
          message +
          "\n(Again, if the answer is not found in the file context above, reply ONLY: 'I don't know based on the provided files.')\n",
      });
      // Use all previous context messages
      let filteredContextMessages = contextMessages || [];
      if (summaryMessage) openaiMessages.push(summaryMessage);
      openaiMessages = openaiMessages.concat(
        filteredContextMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      );
    } else {
      // If no file context or not meaningful, allow LLM to answer generally, never mention fallback phrase, and exclude all previous assistant messages
      openaiMessages.push({
        role: "system",
        content:
          "You are a helpful AI assistant. The user has not uploaded any files for this question, or the file content is not meaningful. Answer as best as you can using your general knowledge. Do not say 'I don't know based on the provided files.'",
      });
      // Only include previous user messages (not assistant)
      let filteredContextMessages = (contextMessages || []).filter(
        (m) => m.role !== "assistant"
      );
      if (summaryMessage) openaiMessages.push(summaryMessage);
      openaiMessages = openaiMessages.concat(
        filteredContextMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      );
    }
    // Add the latest user message if not present
    if (
      !openaiMessages.length ||
      openaiMessages[openaiMessages.length - 1].role !== "user"
    ) {
      openaiMessages.push({ role: "user", content: message });
    }

    // Get assistant response from OpenAI
    let assistantResponse;
    try {
      assistantResponse = await getChatCompletion(openaiMessages);
      const fallback = "I don't know based on the provided files.";
      // Always strip fallback phrase if present and not the only content
      if (
        assistantResponse &&
        assistantResponse.trim() !== fallback &&
        assistantResponse.includes(fallback)
      ) {
        assistantResponse = assistantResponse
          .replace(new RegExp(`\\s*${fallback}\\s*$`), "")
          .trim();
      }
    } catch (err) {
      console.error("OpenAI error:", err.message);
      assistantResponse =
        "Sorry, I could not process your request at this time.";
    }

    // Store assistant message
    const { data: assistantMessage, error: assistantMessageError } =
      await supabase
        .from("messages")
        .insert([
          {
            thread_id: threadIdFinal,
            role: "assistant",
            content: assistantResponse,
            created_at: new Date().toISOString(),
          },
        ])
        .select("id, content, role, created_at")
        .single();

    if (assistantMessageError) {
      console.error("Assistant message creation error:", assistantMessageError);
      throw new AppError("Failed to store assistant message", 500);
    }

    // Generate/update conversation summary (short and long)
    try {
      const allMessages = (contextMessages || []).concat([
        { role: "user", content: message },
        { role: "assistant", content: assistantResponse },
      ]);
      const summaryPrompt = [
        {
          role: "system",
          content:
            "Summarize the following conversation in 1-2 sentences (short) and 5-8 sentences (long). Return as JSON: { short: '', long: '' }",
        },
        ...allMessages.map((m) => ({ role: m.role, content: m.content })),
      ];
      const summaryRaw = await getChatCompletion(summaryPrompt, {
        max_tokens: 300,
      });
      let short_summary = null,
        long_summary = null;
      try {
        const parsed = JSON.parse(summaryRaw);
        short_summary = parsed.short;
        long_summary = parsed.long;
      } catch (e) {
        // fallback: treat as plain text
        short_summary = summaryRaw;
        long_summary = summaryRaw;
      }
      // Upsert summary
      await supabase.from("summaries").upsert(
        [
          {
            thread_id: threadIdFinal,
            short_summary,
            long_summary,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: ["thread_id"] }
      );
    } catch (err) {
      console.error("Summary generation error:", err.message);
    }

    if (assistantMessageError) {
      console.error("Assistant message creation error:", assistantMessageError);
      throw new AppError("Failed to store assistant message", 500);
    }

    res.json({
      success: true,
      data: {
        threadId: threadIdFinal,
        messages: [
          {
            id: userMessage.id,
            content: userMessage.content,
            role: userMessage.role,
            created_at: userMessage.created_at,
          },
          {
            id: assistantMessage.id,
            content: assistantMessage.content,
            role: assistantMessage.role,
            created_at: assistantMessage.created_at,
          },
        ],
      },
    });
  })
);

/**
 * @swagger
 * /api/chat/{threadId}:
 *   get:
 *     summary: Get conversation history
 *     description: Retrieve all messages for a specific conversation thread
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation thread ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Conversation history retrieved successfully
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
 *                     conversation:
 *                       $ref: '#/components/schemas/Conversation'
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Message'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get conversation history
router.get(
  "/:threadId",
  asyncHandler(async (req, res) => {
    const { threadId } = req.params;
    const userId = req.user.id;

    // Verify conversation belongs to user
    const { data: conversation, error: conversationError } = await supabase
      .from("threads")
      .select("id, title, created_at")
      .eq("id", threadId)
      .eq("user_id", userId)
      .single();

    if (conversationError || !conversation) {
      throw new AppError("Conversation not found or access denied", 404);
    }

    // Get messages for this thread
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("id, content, role, created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("Messages fetch error:", messagesError);
      throw new AppError("Failed to fetch conversation messages", 500);
    }

    res.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          created_at: conversation.created_at,
        },
        messages,
      },
    });
  })
);

/**
 * @swagger
 * /api/chat:
 *   get:
 *     summary: Get all conversations for user
 *     description: Retrieve all conversations for the authenticated user
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
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
 *                     conversations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Conversation'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get all conversations for user
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const { data: conversations, error } = await supabase
      .from("threads")
      .select(
        `
      id,
      title,
      created_at,
      messages (
        id,
        content,
        role,
        created_at
      )
    `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Conversations fetch error:", error);
      throw new AppError("Failed to fetch conversations", 500);
    }

    // Format conversations with message count and last message
    const formattedConversations = conversations.map((conv) => {
      const messages = conv.messages || [];
      const lastMessage =
        messages.length > 0 ? messages[messages.length - 1] : null;

      return {
        id: conv.id,
        title: conv.title,
        created_at: conv.created_at,
        message_count: messages.length,
        last_message: lastMessage
          ? {
              content:
                lastMessage.content.substring(0, 100) +
                (lastMessage.content.length > 100 ? "..." : ""),
              role: lastMessage.role,
              created_at: lastMessage.created_at,
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: {
        conversations: formattedConversations,
      },
    });
  })
);

/**
 * @swagger
 * /api/chat/{threadId}:
 *   delete:
 *     summary: Delete conversation
 *     description: Delete a conversation and all its messages
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Conversation thread ID to delete
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: Conversation deleted successfully
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
 *                   example: "Conversation deleted successfully"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Conversation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Delete conversation
router.delete(
  "/:threadId",
  asyncHandler(async (req, res) => {
    const { threadId } = req.params;
    const userId = req.user.id;

    // Verify conversation belongs to user
    const { data: conversation, error: conversationError } = await supabase
      .from("threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", userId)
      .single();

    if (conversationError || !conversation) {
      throw new AppError("Conversation not found or access denied", 404);
    }

    // Delete messages first (due to foreign key constraint)
    const { error: messagesDeleteError } = await supabase
      .from("messages")
      .delete()
      .eq("thread_id", threadId);

    if (messagesDeleteError) {
      console.error("Messages deletion error:", messagesDeleteError);
      throw new AppError("Failed to delete conversation messages", 500);
    }

    // Delete conversation
    const { error: conversationDeleteError } = await supabase
      .from("threads")
      .delete()
      .eq("id", threadId);

    if (conversationDeleteError) {
      console.error("Conversation deletion error:", conversationDeleteError);
      throw new AppError("Failed to delete conversation", 500);
    }

    res.json({
      success: true,
      message: "Conversation deleted successfully",
    });
  })
);

module.exports = router;
