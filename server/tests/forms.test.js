import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import formRoutes from "../routes/forms.js";

vi.mock("../utils/emailAdminOnWaitlist.js", () => ({
  notifyAdminWaitlist: vi.fn(),
}));

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

let db;
let app;

beforeEach(() => {
  db = {
    query: vi.fn(),
  };

  app = express();
  app.use(express.json());
  app.use("/api", formRoutes(db));
});

describe("POST /api/apply", () => {
  it("should submit application successfully", async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app).post("/api/apply").send({
      mcName: "Steve",
      dcName: "Steve#1234",
      age: 20,
      howFound: "Reddit",
      experience: "Building",
      whyJoin: "Fun server",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should handle DB error", async () => {
    db.query.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).post("/api/apply").send({
      mcName: "Alex",
      dcName: "Alex#0001",
      age: 22,
      whyJoin: "Just curious",
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Error submitting application/);
  });
});

describe("POST /api/wait-list", () => {
  it("should add to waitlist", async () => {
    db.query
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rows: [{ email: "test@example.com" }] });

    const res = await request(app).post("/api/wait-list").send({
      email: "test@example.com",
      discordName: "TestUser#0001",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("should reject missing fields", async () => {
    const res = await request(app).post("/api/wait-list").send({
      email: "",
      discordName: "",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Email and Discord username are required/);
  });

  it("should reject invalid email", async () => {
    const res = await request(app).post("/api/wait-list").send({
      email: "invalid-email",
      discordName: "Test#1234",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid email format/);
  });

  it("should detect duplicate email", async () => {
    db.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).post("/api/wait-list").send({
      email: "dupe@example.com",
      discordName: "TestUser#0001",
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already on the waitlist/);
  });

  it("should detect duplicate Discord username", async () => {
    db.query
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app).post("/api/wait-list").send({
      email: "new@example.com",
      discordName: "Duplicate#0001",
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/);
  });

  it("should handle DB insert error", async () => {
    db.query
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockResolvedValueOnce({ rowCount: 0 })
      .mockRejectedValueOnce(new Error("Insert error"));

    const res = await request(app).post("/api/wait-list").send({
      email: "test2@example.com",
      discordName: "User#1234",
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Error submitting waitlist entry/);
  });
});
