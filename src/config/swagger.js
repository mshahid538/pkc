const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PKC API",
      version: "1.0.0",
      description: "Personal Knowledge Console API documentation",
    },
    servers: [{ url: "http://localhost:3000", description: "Local server" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            email: { type: "string", format: "email" },
            username: { type: "string" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Message: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            content: { type: "string" },
            role: { type: "string", enum: ["user", "assistant"] },
            created_at: { type: "string", format: "date-time" },
            thread_id: { type: "string", format: "uuid" },
            user_id: { type: "string", format: "uuid" },
          },
        },
        Conversation: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
            user_id: { type: "string", format: "uuid" },
            message_count: { type: "integer" },
            last_message: { type: "string" },
          },
        },
        File: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            filename: { type: "string" },
            mime: { type: "string" },
            size_bytes: { type: "integer" },
            checksum_sha256: { type: "string" },
            storage_path: { type: "string" },
            file_type: { type: "string" },
            text_content: { type: "string" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.js"],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
