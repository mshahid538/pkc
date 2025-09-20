const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const { supabase, supabaseAdmin } = require("../config/database");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { extractKeywords } = require("../utils/openai");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const XLSX = require("xlsx");
const { parse: csvParse } = require("csv-parse/sync");

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["pdf", "txt", "md"];
    const fileExtension = path
      .extname(file.originalname)
      .toLowerCase()
      .substring(1);
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          `File type .${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
          400
        )
      );
    }
  },
});

/**
 * @swagger
 * /api/ingestion:
 *   post:
 *     summary: External device ingestion endpoint
 *     description: Secure API endpoint for external devices to upload and process files
 *     tags: [Ingestion]
 *     security:
 *       - apiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - device_id
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (PDF, TXT, MD only)
 *               device_id:
 *                 type: string
 *                 description: Unique device identifier
 *               user_id:
 *                 type: string
 *                 description: Target user ID for file ownership
 *     responses:
 *       201:
 *         description: File ingested successfully
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
 *                   example: "File ingested successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     file_id:
 *                       type: string
 *                       format: uuid
 *                     chunks_created:
 *                       type: integer
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid API key
 *       500:
 *         description: Internal server error
 */

// API Key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const validApiKey = process.env.EXTERNAL_API_KEY;
  
  if (!validApiKey) {
    return res.status(500).json({
      success: false,
      message: "External API not configured"
    });
  }
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({
      success: false,
      message: "Invalid API key"
    });
  }
  
  next();
};

// External device ingestion endpoint
router.post(
  "/",
  validateApiKey,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError("No file provided", 400);
    }

    const { device_id, user_id } = req.body;
    
    if (!device_id) {
      throw new AppError("device_id is required", 400);
    }
    
    if (!user_id) {
      throw new AppError("user_id is required", 400);
    }

    // Verify user exists
    const { data: user, error: userError } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("id", user_id)
      .single();
    
    if (userError || !user) {
      throw new AppError("Invalid user_id", 400);
    }

    const file = req.file;
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const fileName = file.originalname;
    const fileSize = file.size;
    const fileBuffer = file.buffer;

    const fileHash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    // Check for existing file
    const { data: existingFile } = await supabase
      .from("files")
      .select("id, filename, text_content")
      .eq("checksum_sha256", fileHash)
      .eq("user_id", user_id)
      .maybeSingle();
    
    if (existingFile) {
      return res.status(201).json({
        success: true,
        message: "File already exists",
        data: {
          file_id: existingFile.id,
          chunks_created: 0
        }
      });
    }

    const storagePath = `${user_id}/${uuidv4()}${fileExtension}`;
    const bucketName = process.env.UPLOAD_BUCKET_NAME || "pkc-uploads";
    
    // Upload to storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    
    if (uploadError) {
      throw new AppError("Failed to upload file to storage", 500);
    }

    // Extract text content
    let textContent = "";
    if ([".txt", ".md", "txt", "md"].includes(fileExtension)) {
      textContent = fileBuffer.toString("utf-8");
    } else if (fileExtension === ".pdf" || fileExtension === "pdf") {
      try {
        const data = await pdfParse(fileBuffer);
        textContent = data.text;
      } catch (err) {
        console.error("PDF extraction error:", err);
        textContent = "";
      }
    }

    // Store file metadata
    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert([
        {
          user_id: user_id,
          filename: fileName,
          mime: file.mimetype,
          size_bytes: fileSize,
          checksum_sha256: fileHash,
          storage_path: storagePath,
          file_type: fileExtension.replace(".", ""),
          text_content: textContent,
          created_at: new Date().toISOString(),
        },
      ])
      .select("id, filename")
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      await supabaseAdmin.storage.from(bucketName).remove([storagePath]);
      throw new AppError("Failed to store file metadata", 500);
    }

    let chunksCreated = 0;

    // Chunk, embed, and store
    if (fileRecord && fileRecord.id && textContent && textContent.length > 0) {
      try {
        const { getEmbeddings } = require("../utils/openai");
        const chunkSize = 2000; // ~500 tokens
        let chunks = [];
        for (let i = 0; i < textContent.length; i += chunkSize) {
          const chunkText = textContent.slice(i, i + chunkSize);
          chunks.push({
            chunk_index: Math.floor(i / chunkSize),
            chunk_text: chunkText,
          });
        }

        const chunkTexts = chunks.map((c) => c.chunk_text);
        let embeddings = [];
        for (let i = 0; i < chunkTexts.length; i += 100) {
          const batch = chunkTexts.slice(i, i + 100);
          try {
            const batchEmbeddings = await getEmbeddings(batch);
            embeddings.push(...batchEmbeddings);
          } catch (embedErr) {
            console.error("[INGESTION] Embedding error for batch", i, embedErr);
            throw embedErr;
          }
        }

        const chunkRows = chunks.map((c, idx) => ({
          user_id: user_id,
          file_id: fileRecord.id,
          filename: fileRecord.filename,
          chunk_index: c.chunk_index,
          chunk_text: c.chunk_text,
          embedding: embeddings[idx],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        
        for (let i = 0; i < chunkRows.length; i += 100) {
          const batch = chunkRows.slice(i, i + 100);
          const { error: chunkInsertError } = await supabaseAdmin
            .from("file_chunks")
            .insert(batch);

          if (chunkInsertError) {
            console.error("[INGESTION] Chunk insert error for batch", i, chunkInsertError);
            throw chunkInsertError;
          }
        }
        
        chunksCreated = chunks.length;

      } catch (err) {
        console.error("[INGESTION] Error during chunking/embedding:", err);
        // Don't fail the request, just log the error
      }
    }

    res.status(201).json({
      success: true,
      message: "File ingested successfully",
      data: {
        file_id: fileRecord.id,
        chunks_created: chunksCreated
      },
    });
  })
);

module.exports = router;
