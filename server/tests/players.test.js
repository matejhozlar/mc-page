import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import playersRoutes from "../routes/players.js";
import { status as mcStatus } from "minecraft-server-util";
import { status as mockStatus } from "minecraft-server-util";
import cookieParser from "cookie-parser";

vi.mock("../logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("../utils/logError.js", () => ({
  default: (e) => e.message || "error",
}));

vi.mock("minecraft-server-util", () => ({
  status: vi.fn(),
}));

describe("GET /api/playerCount", () => {
  let app;
  const serverIP = "127.0.0.1";
  const serverPort = 25565;
  let sharedState;

  beforeEach(() => {
    sharedState = { lastLoggedCount: { value: null } };
    app = express();
    app.use("/api", playersRoutes({}, serverIP, serverPort, sharedState));
  });

  it("returns player count and logs if changed", async () => {
    mcStatus.mockResolvedValueOnce({ players: { online: 10 } });

    const res = await request(app).get("/api/playerCount");
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(10);
  });

  it("returns same player count without logging", async () => {
    mcStatus.mockResolvedValue({ players: { online: 10 } });

    await request(app).get("/api/playerCount");
    const res = await request(app).get("/api/playerCount");

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(10);
  });

  it("returns 500 if status fails", async () => {
    mcStatus.mockRejectedValueOnce(new Error("Connection failed"));

    const res = await request(app).get("/api/playerCount");
    expect(res.status).toBe(500);
    expect(res.body.err).toBe("Failed to fetch player count");
  });
});

describe("GET /api/players", () => {
  let app;
  let db;

  const serverIP = "localhost";
  const serverPort = 25565;

  beforeEach(() => {
    db = {
      query: vi.fn(),
    };

    app = express();
    app.use(cookieParser());
    app.use("/api", playersRoutes(db, serverIP, serverPort));
  });

  it("returns player list and logs if player count changed", async () => {
    mockStatus.mockResolvedValueOnce({
      players: {
        sample: [
          { id: "uuid1", name: "PlayerOne" },
          { id: "uuid2", name: "PlayerTwo" },
        ],
      },
    });

    db.query
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        rows: [
          {
            id: "uuid1",
            name: "PlayerOne",
            online: true,
            last_seen: "2024-01-01",
            play_time_seconds: 100,
            session_start: "2024-01-01",
          },
          {
            id: "uuid2",
            name: "PlayerTwo",
            online: true,
            last_seen: "2024-01-01",
            play_time_seconds: 200,
            session_start: "2024-01-01",
          },
        ],
      });

    const res = await request(app).get("/api/players");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.players)).toBe(true);
    expect(res.body.players).toHaveLength(2);
    expect(mockStatus).toHaveBeenCalled();
    expect(db.query).toHaveBeenCalledTimes(3);
  });

  it("returns 500 if status call fails", async () => {
    mockStatus.mockRejectedValueOnce(new Error("Server offline"));

    const res = await request(app).get("/api/players");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Could not fetch players");
  });
});
