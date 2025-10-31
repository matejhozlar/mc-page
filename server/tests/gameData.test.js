import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import gameRoutes from "../app/routes/gameData.js";
import { unsignedAsSigned } from "./cookies.settings.js";

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
    app.use(unsignedAsSigned(["user_session"]));
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
          auto_click_level: 0,
          offline_earnings_level: 0,
          tool: "hand",
          points: 100,
          inventory: ["hand"],
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
            auto_click_level: 0,
            offline_earnings_level: 0,
            tool: "hand",
            points: 100,
            inventory: ["hand"],
          },
        ],
      })
      .mockResolvedValueOnce({})
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
    app.use(unsignedAsSigned(["user_session"]));
    app.use(express.json());
    app.use("/api", gameRoutes(db));
  });

  const validPayload = {
    points: 100,
    tool: "iron",
    inventory: ["hand", "wooden", "iron"],
    materials: { copper_ore: 2, coal: 1 },
    auto_click_level: 2,
    furnace_level: 1,
    coal_reserve: 2,
    smelting_queue: ["copper_ore"],
    smelt_amounts: { copper_ore: 1 },
    offline_earnings_level: 0,
  };

  it("returns 401 if no session cookie is set", async () => {
    const res = await request(app).post("/api/game-data").send(validPayload);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 400 if input is invalid", async () => {
    const invalidPayload = {
      ...validPayload,
      furnace_level: "not_a_number",
    };

    const res = await request(app)
      .post("/api/game-data")
      .set("Cookie", "user_session=user123")
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid game data");
  });

  it("returns 400 if negative values are provided", async () => {
    const negativePayload = {
      ...validPayload,
      points: -100,
    };

    const res = await request(app)
      .post("/api/game-data")
      .set("Cookie", "user_session=user123")
      .send(negativePayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid negative values");
  });

  it("returns success if insert/update succeeds", async () => {
    db.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ rows: [{ discord_id: "user123" }] })
      .mockResolvedValueOnce({});

    const res = await request(app)
      .post("/api/game-data")
      .set("Cookie", "user_session=user123")
      .send(validPayload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty("discord_id", "user123");
    expect(db.query).toHaveBeenCalledWith("BEGIN");
    expect(db.query).toHaveBeenCalledWith("COMMIT");
  });

  it("returns 500 and rolls back if database throws error", async () => {
    db.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error("DB broken")) // INSERT fails
      .mockResolvedValueOnce({}); // ROLLBACK

    const res = await request(app)
      .post("/api/game-data")
      .set("Cookie", "user_session=user123")
      .send(validPayload);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to save game data");
    expect(db.query).toHaveBeenCalledWith("ROLLBACK");
  });
});

describe("POST /api/game-logout", () => {
  let app;
  let db;

  beforeEach(() => {
    db = { query: vi.fn() };
    app = express();
    app.use(cookieParser());
    app.use(unsignedAsSigned(["user_session"]));
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

describe("POST /api/game-reward/add-balance", () => {
  let app;
  let db;

  beforeEach(() => {
    db = { query: vi.fn() };
    app = express();
    app.use(cookieParser());
    app.use(unsignedAsSigned(["user_session"]));
    app.use(express.json());
    app.use("/api", gameRoutes(db));
  });

  it("returns 401 if no session cookie", async () => {
    const res = await request(app)
      .post("/api/game-reward/add-balance")
      .send({ amount: 100 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 400 if amount is invalid", async () => {
    const res = await request(app)
      .post("/api/game-reward/add-balance")
      .set("Cookie", "user_session=user123")
      .send({ amount: "not-a-number" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid amount");
  });

  it("returns 400 if amount is negative or zero", async () => {
    const res = await request(app)
      .post("/api/game-reward/add-balance")
      .set("Cookie", "user_session=user123")
      .send({ amount: -50 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid amount");
  });

  it("returns success if balance update succeeds", async () => {
    db.query.mockResolvedValueOnce({});

    const res = await request(app)
      .post("/api/game-reward/add-balance")
      .set("Cookie", "user_session=user123")
      .send({ amount: 100 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE user_funds"),
      ["user123", 100]
    );
  });

  it("returns 500 if database update fails", async () => {
    db.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .post("/api/game-reward/add-balance")
      .set("Cookie", "user_session=user123")
      .send({ amount: 100 });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to add balance");
  });
});
