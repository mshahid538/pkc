const request = require("supertest");
const app = require("../src/index");

describe("Authentication Endpoints", () => {
  const testUser = {
    email: "test@example.com",
    username: "testuser",
    password: "password123",
  };

  describe("POST /api/auth/register", () => {
    it("should register a new user successfully", async () => {
      const response = await request(app)
        .post("/api/auth/register")
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty(
        "message",
        "User registered successfully"
      );
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data.user).toHaveProperty("email", testUser.email);
      expect(response.body.data.user).toHaveProperty(
        "username",
        testUser.username
      );
      expect(response.body.data.user).toHaveProperty("id");
      expect(response.body.data.user).toHaveProperty("created_at");
    });

    it("should reject registration with invalid email", async () => {
      const invalidUser = { ...testUser, email: "invalid-email" };

      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Validation failed");
    });

    it("should reject registration with short password", async () => {
      const invalidUser = { ...testUser, password: "123" };

      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Validation failed");
    });

    it("should reject registration with invalid username", async () => {
      const invalidUser = { ...testUser, username: "test@user" };

      const response = await request(app)
        .post("/api/auth/register")
        .send(invalidUser)
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Validation failed");
    });

    it("should reject duplicate registration", async () => {
      await request(app).post("/api/auth/register").send(testUser).expect(201);

      const response = await request(app)
        .post("/api/auth/register")
        .send(testUser)
        .expect(409);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body.message).toContain("already exists");
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send(testUser);
    });

    it("should login successfully with correct credentials", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("message", "Login successful");
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data.user).toHaveProperty("email", testUser.email);
      expect(response.body.data.user).toHaveProperty(
        "username",
        testUser.username
      );
    });

    it("should reject login with incorrect password", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: testUser.email,
          password: "wrongpassword",
        })
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body.message).toContain("Invalid email or password");
    });

    it("should reject login with non-existent email", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: testUser.password,
        })
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body.message).toContain("Invalid email or password");
    });

    it("should reject login with invalid email format", async () => {
      const response = await request(app)
        .post("/api/auth/login")
        .send({
          email: "invalid-email",
          password: testUser.password,
        })
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("message", "Validation failed");
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should return success message", async () => {
      const response = await request(app).post("/api/auth/logout").expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("message", "Logout successful");
    });
  });
});
