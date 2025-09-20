const swaggerJsdoc = require("swagger-jsdoc");

// Determine the base URL dynamically
const getBaseUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return "https://pkc-superbase-openai.vercel.app";
  }
  return `http://localhost:${process.env.PORT || 3000}`;
};

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PKC API",
      version: "1.0.0",
      description: "Personal Knowledge Console API documentation",
    },
    servers: [
      { 
        url: getBaseUrl(), 
        description: process.env.NODE_ENV === "production" ? "Production server" : "Local server" 
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Clerk Session Token",
          description: "Clerk session token from the frontend authentication"
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string", description: "Clerk user ID (VARCHAR)" },
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
            user_id: { type: "string", description: "Clerk user ID (VARCHAR)" },
          },
        },
        Conversation: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            title: { type: "string" },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
            user_id: { type: "string", description: "Clerk user ID (VARCHAR)" },
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
  apis: [
    "./src/routes/*.js",
    "./routes/*.js",
    "./src/index.js"
  ],
};

const specs = swaggerJsdoc(options);

module.exports = specs;
