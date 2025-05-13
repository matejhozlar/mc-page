import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import logger from "../logger.js";
import logError from "../utils/logError.js";
import discordRoutes from "../routes/discordOAuth.js";
import axios from "axios";

vi.mock("axios");
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
vi.mock("../utils/logError.js", () => ({
  default: (e) => e.message || "error",
}));

describe("POST /api/discord/callback-game", () => {
  let app;
  let db;

  beforeEach(() => {
    db = { query: vi.fn() };

    app = express();
    app.use(bodyParser.json());
    app.use(cookieParser());
    app.use("/api", discordRoutes(db));
  });

  it("returns 200 and sets cookie if login is successful and user exists", async () => {
    const discordUser = { id: "123", username: "Steve" };
    axios.post.mockResolvedValueOnce({ data: { access_token: "abc123" } });
    axios.get.mockResolvedValueOnce({ data: discordUser });

    db.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .post("/api/discord/callback-game")
      .send({ code: "fakeCode" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.discordId).toBe("123");
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("returns 403 if user is not registered", async () => {
    axios.post.mockResolvedValueOnce({ data: { access_token: "abc123" } });
    axios.get.mockResolvedValueOnce({
      data: { id: "notInDb", username: "Ghost" },
    });

    db.query.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app)
      .post("/api/discord/callback-game")
      .send({ code: "someCode" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not a registered user.");
  });

  it("returns 500 on any OAuth error", async () => {
    axios.post.mockRejectedValueOnce(new Error("OAuth broke"));

    const res = await request(app)
      .post("/api/discord/callback-game")
      .send({ code: "badCode" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("OAuth error");
  });
});

describe("POST /api/discord/callback", () => {
  let app;
  let db;

  beforeEach(() => {
    db = { query: vi.fn() };
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use("/api", discordRoutes(db));
  });

  it("returns 403 if user is not admin", async () => {
    axios.post.mockResolvedValueOnce({ data: { access_token: "token123" } });
    axios.get.mockResolvedValueOnce({
      data: { id: "user1", username: "NonAdmin" },
    });
    db.query.mockResolvedValueOnce({ rowCount: 0 });

    const res = await request(app)
      .post("/api/discord/callback")
      .send({ code: "abc123" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not an admin.");
  });

  it("sets cookie and returns success if admin", async () => {
    axios.post.mockResolvedValueOnce({ data: { access_token: "token456" } });
    axios.get.mockResolvedValueOnce({
      data: { id: "admin123", username: "AdminUser" },
    });
    db.query.mockResolvedValueOnce({ rowCount: 1 });

    const res = await request(app)
      .post("/api/discord/callback")
      .send({ code: "goodCode" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.header["set-cookie"]).toBeDefined();
    expect(res.header["set-cookie"][0]).toContain("admin_session=");
  });

  it("returns 500 if Discord API fails", async () => {
    axios.post.mockRejectedValueOnce(new Error("OAuth failure"));

    const res = await request(app)
      .post("/api/discord/callback")
      .send({ code: "badCode" });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("OAuth error");
  });
});
