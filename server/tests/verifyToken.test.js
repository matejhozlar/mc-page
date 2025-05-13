import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import playersRoutes from "../routes/verifyToken.js";

vi.mock("../logger.js", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../utils/logError.js", () => ({
  default: (e) => e.message || "error",
}));

describe("POST /api/verify-token", () => {
  let app;
  let db;

  beforeEach(() => {
    db = {
      query: vi.fn(),
    };

    app = express();
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use("/api", playersRoutes(db));
  });

  it("returns 400 if token is missing", async () => {
    const res = await request(app).post("/api/verify-token").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Missing token");
  });

  it("returns 401 if token is invalid or expired", async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/api/verify-token")
      .send({ token: "invalid-token" });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Token expired or invalid");
  });

  it("returns user data if token is valid", async () => {
    db.query.mockResolvedValueOnce({
      rows: [
        {
          discord_id: "123456789",
          discord_name: "Matej#1234",
        },
      ],
    });

    const res = await request(app)
      .post("/api/verify-token")
      .send({ token: "valid-token" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toEqual({
      id: "123456789",
      name: "Matej#1234",
    });
  });

  it("returns 500 if database query fails", async () => {
    db.query.mockRejectedValueOnce(new Error("DB failure"));

    const res = await request(app)
      .post("/api/verify-token")
      .send({ token: "crash-token" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("Internal server error");
  });
});
