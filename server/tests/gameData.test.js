import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import gameRoutes from "../routes/gameData.js";

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

describe("GET /game-data", () => {
  let app;
  let db;

  beforeEach(() => {
    db = { query: vi.fn() };
    app = express();
    app.use(cookieParser());
    app.use("/api", gameRoutes(db));
  });

  it("returns 401 if no session cookie", async () => {
    const res = await request(app).get("/api/game-data");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "Unauthorized" });
  });

  it("returns null if no game data found", async () => {
    db.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get("/api/game-data")
      .set("Cookie", "user_session=user123");

    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it("returns game data without smelting when queue is empty", async () => {
    const now = new Date().toISOString();
    db.query.mockResolvedValueOnce({
      rows: [
        {
          discord_id: "user123",
          materials: { copper_ore: 2 },
          coal_reserve: 1,
          smelting_queue: [],
          furnace_level: 1,
          last_logout_at: now,
          updated_at: now,
        },
      ],
    });

    const res = await request(app)
      .get("/api/game-data")
      .set("Cookie", "user_session=user123");

    expect(res.status).toBe(200);
    expect(res.body.materials).toHaveProperty("copper_ore");
    expect(res.body.smelting_queue).toEqual([]);
    expect(res.body.offline_smelted).toEqual({});
  });

  it("applies smelting when possible", async () => {
    const now = new Date();
    const fiveSecondsAgo = new Date(now.getTime() - 5000).toISOString();

    db.query
      .mockResolvedValueOnce({
        rows: [
          {
            discord_id: "user123",
            materials: { copper_ore: 2 },
            coal_reserve: 1,
            smelting_queue: ["copper_ore"],
            furnace_level: 1,
            last_logout_at: fiveSecondsAgo,
            updated_at: fiveSecondsAgo,
          },
        ],
      })
      .mockResolvedValueOnce({});

    const res = await request(app)
      .get("/api/game-data")
      .set("Cookie", "user_session=user123");

    expect(res.status).toBe(200);
    expect(res.body.materials).toHaveProperty("copper_ingot", 1);
    expect(res.body.materials).toHaveProperty("copper_ore", 1);
    expect(res.body.offline_smelted).toEqual({ copper_ingot: 1 });
  });

  it("returns 500 on DB error", async () => {
    db.query.mockRejectedValueOnce(new Error("DB broken"));

    const res = await request(app)
      .get("/api/game-data")
      .set("Cookie", "user_session=user123");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to load game data");
  });
});

describe("POST /api/game-data", () => {
  let app;
  let db;

  beforeEach(() => {
    db = { query: vi.fn() };
    app = express();
    app.use(cookieParser());
    app.use(express.json());
    app.use("/api", gameRoutes(db));
  });

  const validPayload = {
    points: 100,
    tool: "iron_pickaxe",
    inventory: ["copper_ore", "coal"],
    materials: { copper_ore: 2, coal: 1 },
    auto_click_level: 2,
    furnace_level: 1,
    coal_reserve: 2,
    smelting_queue: ["copper_ore"],
    smelt_amounts: { copper_ore: 1 },
  };

  it("returns 401 if no session cookie is set", async () => {
    const res = await request(app).post("/api/game-data").send(validPayload);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 400 if input is invalid", async () => {
    const invalidPayload = {
      ...validPayload,
      furnace_level: "not_a_number", // invalid
    };

    const res = await request(app)
      .post("/api/game-data")
      .set("Cookie", "user_session=user123")
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid game data");
  });

  it("returns success if insert/update succeeds", async () => {
    db.query.mockResolvedValueOnce({});
    const res = await request(app)
      .post("/api/game-data")
      .set("Cookie", "user_session=user123")
      .send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.query).toHaveBeenCalled();
  });

  it("returns 500 if database throws error", async () => {
    db.query.mockRejectedValueOnce(new Error("DB broken"));

    const res = await request(app)
      .post("/api/game-data")
      .set("Cookie", "user_session=user123")
      .send(validPayload);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to save game data");
  });
});

describe("POST /api/game-logout", () => {
  let app;
  let db;

  beforeEach(() => {
    db = { query: vi.fn() };
    app = express();
    app.use(cookieParser());
    app.use("/api", gameRoutes(db));
  });

  it("returns 401 if no session cookie is present", async () => {
    const res = await request(app).post("/api/game-logout");
    expect(res.status).toBe(401);
  });

  it("returns 204 if logout update succeeds", async () => {
    db.query.mockResolvedValueOnce({});
    const res = await request(app)
      .post("/api/game-logout")
      .set("Cookie", "user_session=user123");

    expect(res.status).toBe(204);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE clicker_game_data"),
      ["user123"]
    );
  });

  it("returns 500 if logout update fails", async () => {
    db.query.mockRejectedValueOnce(new Error("DB error"));
    const res = await request(app)
      .post("/api/game-logout")
      .set("Cookie", "user_session=user123");

    expect(res.status).toBe(500);
  });
});
