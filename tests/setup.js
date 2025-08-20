require("dotenv").config({ path: ".env.test" });

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing-only";
process.env.SUPABASE_URL = "https://test.supabase.co";
process.env.SUPABASE_ANON_KEY = "test-anon-key";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.UPLOAD_BUCKET_NAME = "test-uploads";

global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

global.testUtils = {
  generateTestUser: (overrides = {}) => ({
    email: `test-${Date.now()}@example.com`,
    username: `testuser-${Date.now()}`,
    password: "password123",
    ...overrides,
  }),

  generateTestFile: (overrides = {}) => ({
    originalname: "test.txt",
    mimetype: "text/plain",
    size: 1024,
    buffer: Buffer.from("Test file content"),
    ...overrides,
  }),

  // Wait for a specified time
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Clean up test data
  cleanup: async () => {
    // Add cleanup logic here if needed
  },
};

// Setup and teardown
beforeAll(async () => {
  // Global setup before all tests
});

afterAll(async () => {
  // Global cleanup after all tests
  await global.testUtils.cleanup();
});

beforeEach(async () => {
  // Setup before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Cleanup after each test
});
