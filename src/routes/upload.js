const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const { supabase } = require("../config/database");
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
    const allowedTypes = (
      process.env.ALLOWED_FILE_TYPES || "pdf,txt,md,doc,docx,xls,xlsx,csv"
    ).split(",");
    const fileExtension = path
      .extname(file.originalname)
      .toLowerCase()
      .substring(1);
    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(
        new AppError(
          `File type .${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(
            ", "
          )}`,
          400
        )
      );
    }
  },
});

/**
 * @swagger
 * /api/upload:
 *   post:
 *     summary: Upload a file
 *     description: Upload a file (PDF, TXT, MD, DOC, DOCX, XLS, XLSX, CSV) with SHA256 deduplication
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File to upload (PDF, TXT, MD, DOC, DOCX, XLS, XLSX, CSV only, max 10MB)
 *     responses:
 *       201:
 *         description: File uploaded successfully
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
 *                   example: "File uploaded successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     file:
 *                       $ref: '#/components/schemas/File'
 *       400:
 *         description: Validation error or file type not allowed
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
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Upload file
router.post(
  "/",
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError("No file provided", 400);
    }

    const userId = req.user.id;
    const file = req.file;
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const fileName = file.originalname;
    const fileSize = file.size;
    const fileBuffer = file.buffer;

    const fileHash = crypto
      .createHash("sha256")
      .update(fileBuffer)
      .digest("hex");

    const { data: existingFile } = await supabase
      .from("files")
      .select("id, filename, text_content")
      .eq("checksum_sha256", fileHash)
      .maybeSingle();
    if (existingFile) {
      const { data: existingChunks } = await supabase
        .from("file_chunks")
        .select("id")
        .eq("file_id", existingFile.id)
        .eq("user_id", userId);
      if (existingChunks && existingChunks.length > 0) {
        console.log(
          "[UPLOAD] File and file_chunks already exist for file:",
          existingFile.id
        );
        return res.json({
          success: true,
          message: "File already exists",
          data: { file: existingFile },
        });
      } else {
        let textContent = existingFile.text_content;
        if (!textContent || textContent.length === 0) {
          console.error(
            "[UPLOAD] File exists but has no text content to chunk/embed:",
            existingFile.id
          );
          return res.json({
            success: false,
            message: "File exists but has no text content to chunk/embed.",
            data: { file: existingFile },
          });
        }
        try {
          const { getEmbeddings } = require("../utils/openai");
          const chunkSize = 500;
          let chunks = [];
          for (let i = 0; i < textContent.length; i += chunkSize) {
            const chunkText = textContent.slice(i, i + chunkSize);
            chunks.push({
              chunk_index: Math.floor(i / chunkSize),
              chunk_text: chunkText,
            });
          }
          console.log(
            `[UPLOAD] Chunking file ${existingFile.id}: ${chunks.length} chunks`
          );
          const chunkTexts = chunks.map((c) => c.chunk_text);
          let embeddings = [];
          for (let i = 0; i < chunkTexts.length; i += 100) {
            const batch = chunkTexts.slice(i, i + 100);
            try {
              const batchEmbeddings = await getEmbeddings(batch);
              embeddings.push(...batchEmbeddings);
            } catch (embedErr) {
              console.error("[UPLOAD] Embedding error for batch", i, embedErr);
              throw embedErr;
            }
          }
          if (embeddings.length !== chunks.length) {
            console.error(
              "[UPLOAD] Embedding count does not match chunk count",
              embeddings.length,
              chunks.length
            );
          }
          const chunkRows = chunks.map((c, idx) => ({
            user_id: req.user.id,
            file_id: existingFile.id,
            filename: existingFile.filename,
            chunk_index: c.chunk_index,
            chunk_text: c.chunk_text,
            embedding: embeddings[idx],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));
          for (let i = 0; i < chunkRows.length; i += 100) {
            const batch = chunkRows.slice(i, i + 100);
            const { error: chunkInsertError } = await supabase
              .from("file_chunks")
              .insert(batch);
            if (chunkInsertError) {
              console.error(
                "[UPLOAD] Error inserting file_chunks batch:",
                chunkInsertError
              );
            } else {
              console.log(
                `[UPLOAD] Inserted file_chunks batch: ${i} - ${
                  i + batch.length - 1
                }`
              );
            }
          }
          console.log(
            `[UPLOAD] Finished chunking/embedding for file: ${existingFile.id}`
          );
          return res.json({
            success: true,
            message: "File already exists, but chunks were created.",
            data: { file: existingFile },
          });
        } catch (err) {
          console.error("[UPLOAD] Error during chunking/embedding:", err);
          return res.json({
            success: false,
            message: "Error during chunking/embedding.",
            data: { file: existingFile },
          });
        }
      }
    }

    const storagePath = `${userId}/${uuidv4()}${fileExtension}`;
    const bucketName = process.env.UPLOAD_BUCKET_NAME || "pkc-uploads";
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    if (uploadError)
      throw new AppError("Failed to upload file to storage", 500);

    let textContent = "";
    if ([".txt", ".md", "txt", "md"].includes(fileExtension)) {
      textContent = fileBuffer.toString("utf-8");
    } else if (fileExtension === ".pdf" || fileExtension === "pdf") {
      try {
        const data = await pdfParse(fileBuffer);
        textContent = data.text;
        console.log(
          "[PDF Extracted Text]",
          textContent && textContent.slice(0, 200)
        );
      } catch (err) {
        console.error("PDF extraction error:", err);
        textContent = "";
      }
    } else if (fileExtension === ".docx" || fileExtension === "docx") {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        textContent = result.value;
        console.log(
          "[DOCX Extracted Text]",
          textContent && textContent.slice(0, 200)
        );
      } catch (err) {
        console.error("DOCX extraction error:", err);
        textContent = "";
      }
    } else if ([".xls", ".xlsx", "xls", "xlsx"].includes(fileExtension)) {
      try {
        const workbook = XLSX.read(fileBuffer, { type: "buffer" });
        let sheetText = [];
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          sheetText.push(csv);
        });
        textContent = sheetText.join("\n");
        console.log(
          "[Excel Extracted Text]",
          textContent && textContent.slice(0, 200)
        );
      } catch (err) {
        console.error("Excel extraction error:", err);
        textContent = "";
      }
    } else if (fileExtension === ".csv" || fileExtension === "csv") {
      try {
        const records = csvParse(fileBuffer.toString("utf-8"), {
          columns: false,
        });
        textContent = records.map((row) => row.join(", ")).join("\n");
        console.log(
          "[CSV Extracted Text]",
          textContent && textContent.slice(0, 200)
        );
      } catch (err) {
        console.error("CSV extraction error:", err);
        textContent = "";
      }
    }

    let keywords = [];
    if (textContent && textContent.length > 20) {
      try {
        keywords = await extractKeywords(textContent.substring(0, 2000));
      } catch (err) {}
    }

    let safeTextContent =
      textContent && textContent.length > 100000
        ? textContent.slice(0, 100000)
        : textContent;
    // Store file metadata in database (new schema)
    const safeMime =
      file.mimetype && file.mimetype.length > 50
        ? file.mimetype.slice(0, 50)
        : file.mimetype;
    const safeFileType = fileExtension.replace(".", "").slice(0, 50);
    const { data: fileRecord, error: dbError } = await supabase
      .from("files")
      .insert([
        {
          filename: fileName,
          mime: safeMime,
          size_bytes: fileSize,
          checksum_sha256: fileHash,
          storage_path: storagePath,
          file_type: safeFileType,
          text_content: [
            ".txt",
            ".md",
            ".pdf",
            ".docx",
            ".xls",
            ".xlsx",
            ".csv",
            "txt",
            "md",
            "pdf",
            "docx",
            "xls",
            "xlsx",
            "csv",
          ].includes(fileExtension)
            ? safeTextContent
            : null,
          created_at: new Date().toISOString(),
        },
      ])
      .select(
        "id, filename, mime, size_bytes, checksum_sha256, storage_path, file_type, text_content, created_at"
      )
      .single();

    if (dbError) {
      console.error("Database insert error (files):", dbError);
      await supabase.storage.from(bucketName).remove([storagePath]);
      throw new AppError("Failed to store file metadata", 500);
    }

    let threadId;
    let { data: threads, error: threadsError } = await supabase
      .from("threads")
      .select("id, created_at")
      .eq("user_id", req.user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    if (threadsError) {
      throw new AppError("Failed to fetch threads", 500);
    }
    if (!threads || threads.length === 0) {
      const { data: newThread, error: createError } = await supabase
        .from("threads")
        .insert([
          {
            user_id: req.user.id,
            title:
              fileName.substring(0, 100) + (fileName.length > 100 ? "..." : ""),
            created_at: new Date().toISOString(),
          },
        ])
        .select("id, title, created_at")
        .single();
      if (createError || !newThread) {
        await supabase.from("files").delete().eq("id", fileRecord.id);
        await supabase.storage.from(bucketName).remove([storagePath]);
        throw new AppError("Failed to create thread for file", 500);
      }
      threadId = newThread.id;
    } else {
      threadId = threads[0].id;
    }
    const { error: tfError } = await supabase.from("thread_files").insert([
      {
        thread_id: threadId,
        file_id: fileRecord.id,
        created_at: new Date().toISOString(),
      },
    ]);
    if (tfError) {
      await supabase.from("files").delete().eq("id", fileRecord.id);
      await supabase.storage.from(bucketName).remove([storagePath]);
      throw new AppError("Failed to link file to thread", 500);
    }

    // Insert tags (if any keywords extracted)
    if (keywords.length) {
      for (const kw of keywords) {
        // Upsert tag
        const { data: tag, error: tagError } = await supabase
          .from("tags")
          .upsert([{ name: kw }], { onConflict: ["name"] })
          .select("id")
          .single();
        if (!tagError && tag && tag.id) {
          // Link tag to file
          await supabase.from("item_tags").insert([
            {
              item_type: "file",
              item_id: fileRecord.id,
              tag_id: tag.id,
            },
          ]);
        }
      }
    }

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Clean up uploaded file if database insert fails
      await supabase.storage.from(bucketName).remove([storagePath]);
      throw new AppError("Failed to store file metadata", 500);
    }

    // --- RAG: Chunk, embed, and store in file_chunks table ---
    if (fileRecord && fileRecord.id && textContent && textContent.length > 0) {
      try {
        const { getEmbeddings } = require("../utils/openai");
        const chunkSize = 500;
        let chunks = [];
        for (let i = 0; i < textContent.length; i += chunkSize) {
          const chunkText = textContent.slice(i, i + chunkSize);
          chunks.push({
            chunk_index: Math.floor(i / chunkSize),
            chunk_text: chunkText,
          });
        }
        console.log(
          `[UPLOAD] Chunking file ${fileRecord.id}: ${chunks.length} chunks`
        );
        const chunkTexts = chunks.map((c) => c.chunk_text);
        let embeddings = [];
        for (let i = 0; i < chunkTexts.length; i += 100) {
          const batch = chunkTexts.slice(i, i + 100);
          try {
            const batchEmbeddings = await getEmbeddings(batch);
            embeddings.push(...batchEmbeddings);
          } catch (embedErr) {
            console.error("[UPLOAD] Embedding error for batch", i, embedErr);
            throw embedErr;
          }
        }
        if (embeddings.length !== chunks.length) {
          console.error(
            "[UPLOAD] Embedding count does not match chunk count",
            embeddings.length,
            chunks.length
          );
        }
        const chunkRows = chunks.map((c, idx) => ({
          user_id: req.user.id,
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
          const { error: chunkInsertError } = await supabase
            .from("file_chunks")
            .insert(batch);
          if (chunkInsertError) {
            console.error(
              "[UPLOAD] Error inserting file_chunks batch:",
              chunkInsertError
            );
          } else {
            console.log(
              `[UPLOAD] Inserted file_chunks batch: ${i} - ${
                i + batch.length - 1
              }`
            );
          }
        }
        console.log(
          `[UPLOAD] Finished chunking/embedding for file: ${fileRecord.id}`
        );
      } catch (err) {
        console.error("[UPLOAD] Error during chunking/embedding:", err);
      }
    }

    res.status(201).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        file: fileRecord,
      },
    });
  })
);

/**
 * @swagger
 * /api/upload:
 *   get:
 *     summary: Get all files for user
 *     description: Retrieve all files uploaded by the authenticated user
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Files retrieved successfully
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
 *                     files:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/File'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         total:
 *                           type: integer
 *                           example: 5
 *                         total_pages:
 *                           type: integer
 *                           example: 1
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get all files for user
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Fetch all thread_ids for this user
    const { data: threads, error: threadsError } = await supabase
      .from("threads")
      .select("id")
      .eq("user_id", userId);

    if (threadsError) {
      console.error("Threads fetch error:", threadsError);
      throw new AppError("Failed to fetch user threads", 500);
    }

    const threadIds = threads?.map((t) => t.id) || [];
    if (!threadIds.length) {
      return res.json({
        success: true,
        data: {
          files: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            total_pages: 0,
          },
        },
      });
    }

    // Fetch files linked to these threads
    const {
      data: files,
      error,
      count,
    } = await supabase
      .from("files")
      .select(
        "id, filename, size_bytes, mime, storage_path, created_at, thread_files(thread_id)",
        { count: "exact" }
      )
      .in("thread_files.thread_id", threadIds)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Files fetch error:", error);
      throw new AppError("Failed to fetch files", 500);
    }

    res.json({
      success: true,
      data: {
        files,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / limit),
        },
      },
    });
  })
);

/**
 * @swagger
 * /api/upload/{fileId}:
 *   get:
 *     summary: Get specific file details
 *     description: Retrieve detailed information about a specific file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: File details retrieved successfully
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
 *                     file:
 *                       $ref: '#/components/schemas/File'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get specific file details
router.get(
  "/:fileId",
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const userId = req.user.id;

    // Find all thread_ids for this user
    const { data: threads, error: threadsError } = await supabase
      .from("threads")
      .select("id")
      .eq("user_id", userId);

    if (threadsError) {
      throw new AppError("Failed to fetch user threads", 500);
    }

    const threadIds = threads?.map((t) => t.id) || [];
    if (!threadIds.length) {
      throw new AppError("File not found or access denied", 404);
    }

    // Check if file is linked to any of the user's threads
    const { data: threadFile, error: tfError } = await supabase
      .from("thread_files")
      .select("file_id")
      .eq("file_id", fileId)
      .in("thread_id", threadIds)
      .single();

    if (tfError || !threadFile) {
      console.error("DEBUG: threadIds=", threadIds);
      console.error("DEBUG: threadFile=", threadFile, "tfError=", tfError);
      throw new AppError("File not found or access denied", 404);
    }

    // Fetch file details
    const { data: file, error } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .single();

    if (error || !file) {
      throw new AppError("File not found or access denied", 404);
    }

    res.json({
      success: true,
      data: {
        file: {
          id: file.id,
          file_name: file.file_name,
          file_size: file.file_size,
          file_type: file.file_type,
          storage_url: file.storage_url,
          word_count: file.word_count,
          page_count: file.page_count,
          text_content: file.text_content,
          metadata: file.metadata,
          created_at: file.created_at,
        },
      },
    });
  })
);

/**
 * @swagger
 * /api/upload/{fileId}:
 *   delete:
 *     summary: Delete a file
 *     description: Delete a file from storage and database
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID to delete
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: File deleted successfully
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
 *                   example: "File deleted successfully"
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Delete file
router.delete(
  "/:fileId",
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const userId = req.user.id;

    // Find all thread_ids for this user
    const { data: threads, error: threadsError } = await supabase
      .from("threads")
      .select("id")
      .eq("user_id", userId);

    if (threadsError) {
      throw new AppError("Failed to fetch user threads", 500);
    }

    const threadIds = threads?.map((t) => t.id) || [];
    if (!threadIds.length) {
      throw new AppError("File not found or access denied", 404);
    }

    // Check if file is linked to any of the user's threads
    const { data: threadFiles, error: tfError } = await supabase
      .from("thread_files")
      .select("file_id, thread_id")
      .eq("file_id", fileId)
      .in("thread_id", threadIds);

    if (tfError || !threadFiles || threadFiles.length === 0) {
      console.error("DEBUG: threadIds=", threadIds);
      console.error("DEBUG: threadFiles=", threadFiles, "tfError=", tfError);
      throw new AppError("File not found or access denied", 404);
    }

    // Get file details
    const { data: file, error: findError } = await supabase
      .from("files")
      .select("storage_path")
      .eq("id", fileId)
      .single();

    if (findError || !file) {
      throw new AppError("File not found or access denied", 404);
    }

    const bucketName = process.env.UPLOAD_BUCKET_NAME || "pkc-uploads";

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([file.storage_path]);

    if (storageError) {
      console.error("Storage deletion error:", storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database

    const { error: dbError } = await supabase
      .from("files")
      .delete()
      .eq("id", fileId);

    if (dbError) {
      console.error("Database deletion error:", dbError);
      throw new AppError("Failed to delete file record", 500);
    }

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  })
);

/**
 * @swagger
 * /api/upload/{fileId}/content:
 *   get:
 *     summary: Get file content
 *     description: Retrieve the text content of a file (for text files only)
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: File ID
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: File content retrieved successfully
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
 *                     content:
 *                       type: string
 *                       description: File text content
 *                       example: "This is the content of the file..."
 *                     file_type:
 *                       type: string
 *                       description: File type
 *                       example: "txt"
 *       400:
 *         description: Content preview not available for this file type
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
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
// Get file content (for text files)
router.get(
  "/:fileId/content",
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const userId = req.user.id;

    // Find all thread_ids for this user
    const { data: threads, error: threadsError } = await supabase
      .from("threads")
      .select("id")
      .eq("user_id", userId);

    if (threadsError) {
      throw new AppError("Failed to fetch user threads", 500);
    }

    const threadIds = threads?.map((t) => t.id) || [];
    if (!threadIds.length) {
      throw new AppError("File not found or access denied", 404);
    }

    // Check if file is linked to any of the user's threads
    const { data: threadFile, error: tfError } = await supabase
      .from("thread_files")
      .select("file_id, thread_id")
      .eq("file_id", fileId)
      .in("thread_id", threadIds)
      .single();

    if (tfError || !threadFile) {
      console.error("DEBUG: threadIds=", threadIds);
      console.error("DEBUG: threadFile=", threadFile, "tfError=", tfError);
      throw new AppError("File not found or access denied", 404);
    }

    // Fetch file content
    const { data: file, error } = await supabase
      .from("files")
      .select("file_type, text_content")
      .eq("id", fileId)
      .single();

    if (error || !file) {
      throw new AppError("File not found or access denied", 404);
    }

    if (!["txt", "md", "pdf"].includes(file.file_type)) {
      throw new AppError(
        "Content preview only available for text files and PDFs",
        400
      );
    }

    res.json({
      success: true,
      data: {
        content: file.text_content,
        file_type: file.file_type,
      },
    });
  })
);

module.exports = router;
