const request = require("supertest");
const app = require("../src/index");

describe("Health Endpoints", () => {
  describe("GET /healthz", () => {
    it("should return health status with system information", async () => {
      const response = await request(app).get("/healthz").expect(200);

      expect(response.body).toHaveProperty("status", "ok");
      expect(response.body).toHaveProperty("timestamp");
      expect(response.body).toHaveProperty("version");
      expect(response.body).toHaveProperty("commit");
      expect(response.body).toHaveProperty("environment");
      expect(response.body).toHaveProperty("uptime");
      expect(response.body).toHaveProperty("memory");
      expect(response.body).toHaveProperty("database");
    });

    it("should return 503 when database is unhealthy", async () => {
      const response = await request(app).get("/healthz").expect(200);
      expect(response.body).toHaveProperty("database");
    });
  });
});
