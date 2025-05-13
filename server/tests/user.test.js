import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import playersRoutes from "../routes/user.js";

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

describe("GET /api/user/validate", () => {
  let app;
  let db;

  beforeEach(() => {
    db = {
      query: vi.fn(),
    };

    app = express();
    app.use(cookieParser());
    app.use("/api", playersRoutes(db));
  });

  it("returns 401 if no session cookie is present", async () => {
    const res = await request(app).get("/api/user/validate");

    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
  });

  it("returns 401 if user is not found", async () => {
    db.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .get("/api/user/validate")
      .set("Cookie", "user_session=some_id");

    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
    expect(db.query).toHaveBeenCalledWith(
      `SELECT name, discord_id FROM users WHERE discord_id = $1`,
      ["some_id"]
    );
  });

  it("returns user info if session is valid", async () => {
    db.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ name: "Matej", discord_id: "1234567890" }],
    });

    const res = await request(app)
      .get("/api/user/validate")
      .set("Cookie", "user_session=1234567890");

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.name).toBe("Matej");
    expect(res.body.discord_id).toBe("1234567890");
  });
});

describe("GET /api/user/me", () => {
  let app;
  let db;

  beforeEach(() => {
    db = {
      query: vi.fn(),
    };

    app = express();
    app.use(cookieParser());
    app.use("/api", playersRoutes(db));
  });

  it("returns 403 if no session cookie is provided", async () => {
    const res = await request(app).get("/api/user/me");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 404 if user is not found in the database", async () => {
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/user/me")
      .set("Cookie", "user_session=nonexistent_id");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found");
  });

  it("returns user data if found", async () => {
    const user = {
      id: 1,
      name: "Matej",
      discord_id: "1234567890",
      role: "admin",
    };

    db.query.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app)
      .get("/api/user/me")
      .set("Cookie", "user_session=1234567890");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
  });

  it("returns 500 on database error", async () => {
    db.query.mockRejectedValueOnce(new Error("DB fail"));

    const res = await request(app)
      .get("/api/user/me")
      .set("Cookie", "user_session=1234567890");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});
