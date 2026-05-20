import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { createApp } from "../app.js";
import userRoutes from "../routes/userRoutes.js";
import User from "../models/userModel.js";
import { clearTestDB, closeTestDB, connectTestDB } from "./setupTestDB.js";

const createUserPayload = (overrides = {}) => ({
  username: "Test User",
  email: "test@example.com",
  password: "password123",
  ...overrides,
});

const createDbUser = async ({
  username = "Existing User",
  email = "existing@example.com",
  password = "password123",
  isAdmin = false,
  isSeller = false,
} = {}) => {
  const hashedPassword = await bcrypt.hash(password, 10);

  return User.create({
    username,
    email,
    password: hashedPassword,
    isAdmin,
    isSeller,
  });
};

describe("auth API integration", () => {
  let app;

  beforeAll(async () => {
    await connectTestDB();

    app = createApp({
      routes: {
        userRoutes,
      },
    });
  });

  afterEach(async () => {
    await clearTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
  });

  it("registers a new user and sets auth cookie", async () => {
    const response = await request(app)
      .post("/api/users")
      .send(createUserPayload())
      .expect(201);

    expect(response.body).toMatchObject({
      username: "test user",
      email: "test@example.com",
      isSeller: false,
      isAdmin: false,
    });

    expect(response.headers["set-cookie"]?.[0]).toContain("jwt");

    const savedUser = await User.findOne({ email: "test@example.com" });

    expect(savedUser).toBeTruthy();
    expect(savedUser.password).not.toBe("password123");
  });

  it("blocks duplicate registration emails", async () => {
    await createDbUser({
      email: "test@example.com",
    });

    const response = await request(app)
      .post("/api/users")
      .send(createUserPayload())
      .expect(400);

    expect(response.body.message).toBe("User already exists");
  });

  it("logs in an existing user and returns safe user payload", async () => {
    await createDbUser({
      username: "Login User",
      email: "login@example.com",
      password: "password123",
      isSeller: true,
    });

    const response = await request(app)
      .post("/api/users/auth")
      .send({
        email: "login@example.com",
        password: "password123",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      username: "login user",
      email: "login@example.com",
      isSeller: true,
      isAdmin: false,
    });

    expect(response.body.password).toBeUndefined();
    expect(response.headers["set-cookie"]?.[0]).toContain("jwt");
  });

  it("rejects wrong login credentials", async () => {
    await createDbUser({
      email: "wrong-login@example.com",
      password: "password123",
    });

    const response = await request(app)
      .post("/api/users/auth")
      .send({
        email: "wrong-login@example.com",
        password: "bad-password",
      })
      .expect(400);

    expect(response.body.message).toBe("Wrong credentials");
  });

  it("returns current user profile for authenticated user", async () => {
    await createDbUser({
      username: "Profile User",
      email: "profile@example.com",
      password: "password123",
    });

    const agent = request.agent(app);

    const loginResponse = await agent.post("/api/users/auth").send({
      email: "profile@example.com",
      password: "password123",
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.headers["set-cookie"]?.[0]).toContain("jwt");

    const response = await agent.get("/api/users/profile").expect(200);

    expect(response.body).toMatchObject({
      username: "profile user",
      email: "profile@example.com",
    });
  });

  it("updates current user profile", async () => {
    await createDbUser({
      username: "Old Name",
      email: "old@example.com",
      password: "password123",
    });

    const agent = request.agent(app);

    const loginResponse = await agent.post("/api/users/auth").send({
      email: "old@example.com",
      password: "password123",
    });

    expect(loginResponse.status).toBe(200);

    const response = await agent
      .put("/api/users/profile")
      .send({
        username: "New Name",
        email: "new@example.com",
      })
      .expect(200);

    expect(response.body).toMatchObject({
      username: "new name",
      email: "new@example.com",
    });

    const updatedUser = await User.findOne({ email: "new@example.com" });

    expect(updatedUser.username).toBe("new name");
  });

  it("logs out and clears jwt cookie", async () => {
    const response = await request(app).post("/api/users/logout").expect(201);

    expect(response.body.message).toBe("Logged out succesfully");
    expect(response.headers["set-cookie"]?.[0]).toContain("jwt=;");
  });

  it("allows admin to list users", async () => {
    await createDbUser({
      username: "Admin User",
      email: "admin@example.com",
      password: "password123",
      isAdmin: true,
    });

    await createDbUser({
      username: "Normal User",
      email: "normal@example.com",
      password: "password123",
    });

    const agent = request.agent(app);

    const loginResponse = await agent.post("/api/users/auth").send({
      email: "admin@example.com",
      password: "password123",
    });

    expect(loginResponse.status).toBe(200);

    const response = await agent.get("/api/users").expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0].password).toBeUndefined();
  });

  it("throttles repeated failed login attempts", async () => {
    await createDbUser({
      email: "blocked@example.com",
      password: "password123",
    });

    for (let i = 0; i < 6; i += 1) {
      await request(app).post("/api/users/auth").send({
        email: "blocked@example.com",
        password: "wrong-password",
      });
    }

    const response = await request(app)
      .post("/api/users/auth")
      .send({
        email: "blocked@example.com",
        password: "wrong-password",
      })
      .expect(429);

    expect(response.body.message).toMatch(/Too many login (failures|attempts)/);
    expect(response.headers["retry-after"]).toBeTruthy();
  });
});
