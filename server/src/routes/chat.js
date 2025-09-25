const express = require("express");
const { body, validationResult } = require("express-validator");

const { supabase, supabaseAdmin } = require("../config/database");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { authenticateToken } = require("../middleware/auth");
const { getChatCompletion } = require("../utils/openai");

const router = express.Router();

// Validation middleware
const validateChatMessage = [
  body("message").notEmpty().trim(),
  body("threadId").optional({ checkFalsy: true }).isUUID(),
];

// Create or continue conversation thread
router.post(
  "/",
  authenticateToken,
  validateChatMessage,
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError("Validation failed", 400);
    }

    const { message, threadId } = req.body;
    const userId = req.user.id;
    
    console.log('Chat request debug:', {
      userId: userId,
      userExists: !!req.user,
      messageLength: message ? message.length : 0,
      threadId: threadId
    });

    let threadIdFinal = threadId;

    // If no threadId provided, create new thread
    if (!threadId) {
      if (!userId) {
        console.error("No userId available for thread creation");
        throw new AppError("User not authenticated", 401);
      }
      
      
      // Create new thread
      const { data: newThread, error: createError } = await supabaseAdmin
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
      const { data: thread, error: findError } = await supabaseAdmin
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
    const { data: userMessage, error: userMessageError } = await supabaseAdmin
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
    const { data: contextMessages, error: contextError } = await supabaseAdmin
      .from("messages")
      .select("role, content")
      .eq("thread_id", threadIdFinal)
      .order("created_at", { ascending: true })
      .limit(10);
    if (contextError) {
      console.error("Context fetch error:", contextError);
      throw new AppError("Failed to fetch conversation context", 500);
    }

    const { findRelevantChunks } = require("../utils/openai");
    let fileContext = "";
    try {
      const { data: allChunks, error: chunkError } = await supabaseAdmin
        .from("file_chunks")
        .select("id, chunk_text, file_id")
        .eq("user_id", userId)
        .limit(50);
      
      if (chunkError) {
        console.error("Chunk fetch error:", chunkError);
        throw chunkError;
      }
      
      if (allChunks && allChunks.length > 0) {
        const relevantChunks = await findRelevantChunks(message, allChunks, 5);
        
        if (relevantChunks && relevantChunks.length > 0) {
          fileContext = relevantChunks.map(chunk => chunk.chunk_text).join('\n\n');
        }
      }
      
      if (fileContext.length > 8000) fileContext = fileContext.slice(0, 8000);
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

    function isRelevantContext(context, question) {
      if (!context || !question) return false;
      
      const contextLower = context.toLowerCase();
      const questionLower = question.toLowerCase();
      
      // Extract meaningful words from the question
      const questionWords = questionLower.split(/\s+/).filter(word => 
        word.length > 2 && !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'tell', 'me', 'what', 'how', 'when', 'where', 'why', 'who', 'which'].includes(word)
      );

      // Check if any meaningful question words appear in the context
      const hasRelevantWords = questionWords.some(word => contextLower.includes(word));
      
      // For now, let the AI decide dynamically rather than hardcoding general topics
      // The AI will be instructed to determine if the question is about general knowledge or file content
      return hasRelevantWords;
    }

    // If no file context at all, definitely use general knowledge
    if (!fileContext || fileContext.trim().length === 0) {
      console.log('No file context available, using general knowledge');
      var hasRelevantFileContext = false;
    } else {
      var hasRelevantFileContext = isMeaningfulContext(fileContext) && 
      isRelevantContext(fileContext, message);
    }
    
    // Debug logging
    console.log('File context debug:', {
      hasFileContext: !!fileContext,
      fileContextLength: fileContext ? fileContext.length : 0,
      isMeaningful: fileContext ? isMeaningfulContext(fileContext) : false,
      isRelevant: fileContext ? isRelevantContext(fileContext, message) : false,
      hasRelevantFileContext,
      message: message.substring(0, 100)
    });



    if (hasRelevantFileContext) {
      console.log('Using FILE-BASED system prompt');
      openaiMessages.push({
        role: "system",
        content:
          "You are an assistant for the Personal Knowledge Console (PKC). The user has uploaded files as their personal knowledge base.\n" +
          "IMPORTANT: First, determine if the user's question is asking about general knowledge (like 'tallest buildings in the world', 'capital cities', 'historical facts', etc.) or if it's asking about specific content from their uploaded files.\n" +
          "\nIf the question is about GENERAL KNOWLEDGE (facts about the world, history, geography, science, etc.), answer using your general knowledge and do NOT say 'I don't know based on the provided files.'\n" +
          "\nIf the question is about SPECIFIC CONTENT from their uploaded files, use the file content below.\n" +
          "\n--- FILE CONTEXT START ---\n" +
          fileContext +
          "\n--- FILE CONTEXT END ---\n" +
          "\nUser question: " +
          message +
          "\n\nAnalyze the question and respond appropriately. If it's a general knowledge question, use your training data. If it's about specific file content, use the files above.\n\n" +
          "CONVERSATION CONTEXT: You have access to the conversation history above. Use this context to provide relevant, contextual responses. Reference previous messages when appropriate to maintain conversation flow and continuity.",
      });
      let filteredContextMessages = contextMessages || [];
      if (summaryMessage) openaiMessages.push(summaryMessage);
      openaiMessages = openaiMessages.concat(
        filteredContextMessages.map((m) => ({
          role: m.role,
          content: m.content,
        }))
      );
    } else {
      console.log('Using GENERAL KNOWLEDGE system prompt');
      openaiMessages.push({
        role: "system",
        content:
          "You are a helpful AI assistant. Answer the user's question using your general knowledge and training data. Provide informative and helpful responses about topics like geography, history, science, technology, culture, and other general knowledge subjects. Do not mention files or say 'I don't know based on the provided files.'\n\n" +
          "IMPORTANT: You have access to the conversation history above. Use this context to provide relevant, contextual responses. Reference previous messages when appropriate to maintain conversation flow and continuity.",
      });
      let filteredContextMessages = contextMessages || [];
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
      await supabaseAdmin
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
      await supabaseAdmin.from("summaries").upsert(
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

    // Fetch all messages for this thread to return complete conversation
    const { data: allMessages, error: allMessagesError } = await supabaseAdmin
      .from("messages")
      .select("id, content, role, created_at")
      .eq("thread_id", threadIdFinal)
      .order("created_at", { ascending: true });

    if (allMessagesError) {
      console.error("Error fetching all messages:", allMessagesError);
      // Fallback to just the latest two messages
    res.json({
      success: true,
      data: {
        thread_id: threadIdFinal,
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
    } else {
      res.json({
        success: true,
        data: {
          thread_id: threadIdFinal,
          messages: allMessages,
        },
      });
    }
  })
);

// Get conversation history
router.get(
  "/:threadId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { threadId } = req.params;
    const userId = req.user.id;

    // Verify conversation belongs to user
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("threads")
      .select("id, title, created_at")
      .eq("id", threadId)
      .eq("user_id", userId)
      .single();

    if (conversationError || !conversation) {
      throw new AppError("Conversation not found or access denied", 404);
    }

    // Get messages for this thread
    const { data: messages, error: messagesError } = await supabaseAdmin
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

// Get all conversations for user
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const { data: conversations, error } = await supabaseAdmin
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

// Delete conversation
router.delete(
  "/:threadId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { threadId } = req.params;
    const userId = req.user.id;

    // Verify conversation belongs to user
    const { data: conversation, error: conversationError } = await supabaseAdmin
      .from("threads")
      .select("id")
      .eq("id", threadId)
      .eq("user_id", userId)
      .single();

    if (conversationError || !conversation) {
      throw new AppError("Conversation not found or access denied", 404);
    }

    // Delete messages first (due to foreign key constraint)
    const { error: messagesDeleteError } = await supabaseAdmin
      .from("messages")
      .delete()
      .eq("thread_id", threadId);

    if (messagesDeleteError) {
      console.error("Messages deletion error:", messagesDeleteError);
      throw new AppError("Failed to delete conversation messages", 500);
    }

    // Delete conversation
    const { error: conversationDeleteError } = await supabaseAdmin
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
