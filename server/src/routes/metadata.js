const express = require("express");
const { supabase, supabaseAdmin } = require("../config/database");
const { asyncHandler, AppError } = require("../middleware/errorHandler");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Get file metadata
router.get(
  "/:fileId",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const userId = req.user.id;

    const { data: fileWithMetadata, error } = await supabaseAdmin
      .from("file_metadata_view")
      .select("*")
      .eq("file_id", fileId)
      .eq("user_id", userId)
      .single();

    if (error || !fileWithMetadata) {
      throw new AppError("File not found or access denied", 404);
    }

    const metadata = fileWithMetadata.metadata || [];
    const allEntities = {};
    const allTags = [];
    const allRelationships = [];

    metadata.forEach(meta => {
      if (meta.entities) {
        Object.keys(meta.entities).forEach(key => {
          if (!allEntities[key]) allEntities[key] = [];
          allEntities[key] = [...new Set([...allEntities[key], ...meta.entities[key]])];
        });
      }
      if (meta.tag) allTags.push(meta.tag);
      if (meta.relationships) allRelationships.push(...meta.relationships);
    });

    res.json({
      success: true,
      data: {
        file_id: fileWithMetadata.file_id,
        filename: fileWithMetadata.filename,
        file_type: fileWithMetadata.file_type,
        entities: allEntities,
        tags: [...new Set(allTags)],
        relationships: allRelationships,
        created_at: fileWithMetadata.file_created_at
      }
    });
  })
);

// Get all metadata for user
router.get(
  "/",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { tag, limit = 50, offset = 0 } = req.query;

    let query = supabaseAdmin
      .from("file_metadata_view")
      .select("*")
      .eq("user_id", userId)
      .order("file_created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (tag) {
      query = query.contains("metadata", [{ tag }]);
    }

    const { data: files, error } = await query;

    if (error) {
      throw new AppError("Failed to retrieve metadata", 500);
    }

    const processedFiles = files.map(file => {
      const metadata = file.metadata || [];
      const allEntities = {};
      const allTags = [];
      const allRelationships = [];

      metadata.forEach(meta => {
        if (meta.entities) {
          Object.keys(meta.entities).forEach(key => {
            if (!allEntities[key]) allEntities[key] = [];
            allEntities[key] = [...new Set([...allEntities[key], ...meta.entities[key]])];
          });
        }
        if (meta.tag) allTags.push(meta.tag);
        if (meta.relationships) allRelationships.push(...meta.relationships);
      });

      return {
        file_id: file.file_id,
        filename: file.filename,
        file_type: file.file_type,
        entities: allEntities,
        tags: [...new Set(allTags)],
        relationships: allRelationships,
        created_at: file.file_created_at
      };
    });

    res.json({
      success: true,
      data: processedFiles,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: files.length
      }
    });
  })
);

// Update metadata tag
router.put(
  "/:fileId/tag",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const { tag } = req.body;
    const userId = req.user.id;

    if (!tag) {
      throw new AppError("Tag is required", 400);
    }

    const validTags = [
      'work', 'personal', 'task', 'deal', 'idea', 'finance', 'health',
      'meeting', 'project', 'research', 'legal', 'contract', 'invoice',
      'report', 'presentation', 'notes', 'documentation', 'education',
      'travel', 'reference'
    ];

    if (!validTags.includes(tag)) {
      throw new AppError("Invalid tag", 400);
    }

    const { data: existingMetadata, error: fetchError } = await supabaseAdmin
      .from("metadata")
      .select("*")
      .eq("file_id", fileId)
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new AppError("Failed to fetch metadata", 500);
    }

    let result;
    if (existingMetadata) {
      const { data, error } = await supabaseAdmin
        .from("metadata")
        .update({ tag })
        .eq("id", existingMetadata.id)
        .select()
        .single();

      if (error) throw new AppError("Failed to update metadata", 500);
      result = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("metadata")
        .insert({
          file_id: fileId,
          user_id: userId,
          tag,
          entities: {},
          relationships: []
        })
        .select()
        .single();

      if (error) throw new AppError("Failed to create metadata", 500);
      result = data;
    }

    res.json({
      success: true,
      data: result
    });
  })
);

// Add relationship
router.post(
  "/:fileId/relationships",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const { fileId } = req.params;
    const { type, target_id, note } = req.body;
    const userId = req.user.id;

    if (!type || !target_id) {
      throw new AppError("Type and target_id are required", 400);
    }

    const { data: existingMetadata, error: fetchError } = await supabaseAdmin
      .from("metadata")
      .select("*")
      .eq("file_id", fileId)
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new AppError("Failed to fetch metadata", 500);
    }

    const newRelationship = { type, target_id, note: note || "" };

    let result;
    if (existingMetadata) {
      const relationships = existingMetadata.relationships || [];
      relationships.push(newRelationship);

      const { data, error } = await supabaseAdmin
        .from("metadata")
        .update({ relationships })
        .eq("id", existingMetadata.id)
        .select()
        .single();

      if (error) throw new AppError("Failed to update relationships", 500);
      result = data;
    } else {
      const { data, error } = await supabaseAdmin
        .from("metadata")
        .insert({
          file_id: fileId,
          user_id: userId,
          tag: null,
          entities: {},
          relationships: [newRelationship]
        })
        .select()
        .single();

      if (error) throw new AppError("Failed to create metadata", 500);
      result = data;
    }

    res.json({
      success: true,
      data: result
    });
  })
);

// Get metadata statistics
router.get(
  "/stats/overview",
  authenticateToken,
  asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const { data: metadata, error } = await supabaseAdmin
      .from("metadata")
      .select("tag, entities, relationships")
      .eq("user_id", userId);

    if (error) {
      throw new AppError("Failed to retrieve metadata statistics", 500);
    }

    const stats = {
      total_files: metadata.length,
      tag_counts: {},
      entity_counts: {},
      relationship_counts: {}
    };

    metadata.forEach(meta => {
      if (meta.tag) {
        stats.tag_counts[meta.tag] = (stats.tag_counts[meta.tag] || 0) + 1;
      }

      if (meta.entities) {
        Object.keys(meta.entities).forEach(entityType => {
          const count = meta.entities[entityType].length;
          stats.entity_counts[entityType] = (stats.entity_counts[entityType] || 0) + count;
        });
      }

      if (meta.relationships) {
        meta.relationships.forEach(rel => {
          stats.relationship_counts[rel.type] = (stats.relationship_counts[rel.type] || 0) + 1;
        });
      }
    });

    res.json({
      success: true,
      data: stats
    });
  })
);

module.exports = router;