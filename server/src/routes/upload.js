const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const { supabase, supabaseAdmin } = require("../config/database");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { authenticateToken } = require("../middleware/auth");

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
    ).split(",").map(type => type.trim().toLowerCase());
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

// Upload file
router.post(
  "/",
  authenticateToken,
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

    const { data: existingFile } = await supabaseAdmin
      .from("files")
      .select("id, filename, text_content, user_id")
      .eq("checksum_sha256", fileHash)
      .eq("user_id", userId)
      .maybeSingle();
    if (existingFile) {
      const { data: existingChunks } = await supabaseAdmin
        .from("file_chunks")
        .select("id")
        .eq("file_id", existingFile.id)
        .eq("user_id", userId);
      if (existingChunks && existingChunks.length > 0) {

        return res.json({
          success: true,
          message: "File already exists",
          data: { file: existingFile },
        });
      } else {
        let textContent = existingFile.text_content;
        if (!textContent || textContent.length === 0) {
          
          return res.json({
            success: false,
            message: "File exists but has no text content to chunk/embed.",
            data: { file: existingFile },
          });
        }
        try {
          const { getEmbeddings } = require("../utils/openai");
          const chunkSize = 2000;
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
              console.error("[UPLOAD] Embedding error for batch", i, embedErr);
              throw embedErr;
            }
          }
          if (embeddings.length !== chunks.length) {

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
            const { error: chunkInsertError } = await supabaseAdmin
              .from("file_chunks")
              .insert(batch);
            if (chunkInsertError) {
              console.error(
                "[UPLOAD] Error inserting file_chunks batch:",
                chunkInsertError
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
    

    
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(storagePath, fileBuffer, {
        contentType: file.mimetype,
        upsert: false,
      });
    
    if (uploadError) {
      throw new AppError("Failed to upload file to storage", 500);
    }

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
    } else if ([".doc", ".docx", "doc", "docx"].includes(fileExtension)) {
      try {
        const result = await mammoth.extractRawText({ buffer: fileBuffer });
        textContent = result.value;

      } catch (err) {
        console.error(`${fileExtension.toUpperCase()} extraction error:`, err);
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
    // Store file metadata in database
    const safeMime =
      file.mimetype && file.mimetype.length > 50
        ? file.mimetype.slice(0, 50)
        : file.mimetype;
    const safeFileType = fileExtension.replace(".", "").slice(0, 50);
    const { data: fileRecord, error: dbError } = await supabaseAdmin
      .from("files")
      .insert([
        {
          filename: fileName,
          mime: safeMime,
          size_bytes: fileSize,
          checksum_sha256: fileHash,
          storage_path: storagePath,
          file_type: safeFileType,
          user_id: req.user.id,
          text_content: [
            ".txt",
            ".md",
            ".pdf",
            ".doc",
            ".docx",
            ".xls",
            ".xlsx",
            ".csv",
            "txt",
            "md",
            "pdf",
            "doc",
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
      await supabaseAdmin.storage.from(bucketName).remove([storagePath]);
      throw new AppError("Failed to store file metadata", 500);
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
          await supabaseAdmin.from("item_tags").insert([
            {
              item_type: "file",
              item_id: fileRecord.id,
              tag_id: tag.id,
            },
          ]);
        }
      }
    }

    // Chunk, embed, and store in file_chunks table
    if (fileRecord && fileRecord.id && textContent && textContent.length > 0) {
      try {
        const { getEmbeddings } = require("../utils/openai");
        const chunkSize = 2000;
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
            console.error("[UPLOAD] Embedding error for batch", i, embedErr);
            throw embedErr;
          }
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
          const { error: chunkInsertError } = await supabaseAdmin
            .from("file_chunks")
            .insert(batch);

          if (chunkInsertError) {
            console.error("[UPLOAD] Chunk insert error for batch", i, chunkInsertError);
            throw chunkInsertError;
          }
        }
        

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

// Get all files for user
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    

    const {
      data: files,
      error,
      count,
    } = await supabaseAdmin
      .from("files")
      .select(
        "id, filename, size_bytes, mime, storage_path, created_at",
        { count: "exact" }
      )
      .eq("user_id", userId)
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
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const userId = req.user.id;


    const { data: file, error } = await supabase
      .from("files")
      .select("*")
      .eq("id", fileId)
      .eq("user_id", userId)
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
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const userId = req.user.id;
    

    const { data: file, error: findError } = await supabaseAdmin
      .from("files")
      .select("storage_path, id, user_id")
      .eq("id", fileId)
      .eq("user_id", userId)
      .single();

    if (findError || !file) {
      throw new AppError("File not found or access denied", 404);
    }


    const bucketName = process.env.UPLOAD_BUCKET_NAME || "pkc-uploads";

    // Delete from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from(bucketName)
      .remove([file.storage_path]);

    if (storageError) {
      console.error("Storage deletion error:", storageError);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete from database - first delete file_chunks, then thread_files, then file
    const { error: chunksDeleteError } = await supabaseAdmin
      .from("file_chunks")
      .delete()
      .eq("file_id", fileId);

    if (chunksDeleteError) {
      console.error("File chunks deletion error:", chunksDeleteError);
    }

    const { error: threadFilesDeleteError } = await supabaseAdmin
      .from("thread_files")
      .delete()
      .eq("file_id", fileId);

    if (threadFilesDeleteError) {
      console.error("Thread files deletion error:", threadFilesDeleteError);
    }

    const { error: dbError } = await supabaseAdmin
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
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const userId = req.user.id;

    const { data: file, error } = await supabase
      .from("files")
      .select("file_type, text_content, user_id")
      .eq("id", fileId)
      .eq("user_id", userId)
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

/**
 * @swagger
 * /api/upload/{fileId}/download:
 *   get:
 *     summary: Download a file
 *     description: Download a file from storage
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
 *         description: File ID to download
 *         example: "123e4567-e89b-12d3-a456-426614174000"
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
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
// Download file
router.get(
  "/:fileId/download",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const userId = req.user.id;

    const { data: file, error } = await supabase
      .from("files")
      .select("filename, storage_path, mime, user_id")
      .eq("id", fileId)
      .eq("user_id", userId)
      .single();

    if (error || !file) {
      throw new AppError("File not found or access denied", 404);
    }

    const bucketName = process.env.UPLOAD_BUCKET_NAME || "pkc-uploads";

    // Get file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(bucketName)
      .download(file.storage_path);

    if (downloadError) {
      console.error("Storage download error:", downloadError);
      throw new AppError("Failed to download file", 500);
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Set appropriate headers
    res.setHeader('Content-Type', file.mime || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.setHeader('Content-Length', buffer.length);

    // Send file
    res.send(buffer);
  })
);

module.exports = router;
