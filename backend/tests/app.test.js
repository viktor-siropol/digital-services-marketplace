import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("Express app shell", () => {
  it("returns API health status", async () => {
    const app = createApp();

    const response = await request(app).get("/api/health").expect(200);

    expect(response.body).toMatchObject({
      status: "ok",
      service: "marketplace-api",
    });
  });

  it("returns JSON 404 for unknown routes", async () => {
    const app = createApp();

    const response = await request(app).get("/api/unknown-route").expect(404);

    expect(response.body.message).toBe("Not Found - /api/unknown-route");
  });
});
