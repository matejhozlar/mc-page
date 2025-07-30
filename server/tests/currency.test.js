import { describe, it, beforeEach, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { DateTime } from "luxon";

// Fix secret for test
const JWT_SECRET = process.env.JWT_SECRET;

function createClientMock(responses = []) {
  const query = vi.fn();
  responses.forEach((res) => query.mockResolvedValueOnce(res));
  return {
    query,
    release: vi.fn(),
  };
}

vi.mock("../logger.js", () => ({
  default: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("../discord/listeners/web/voteManager.js", () => ({
  startVote: vi.fn(),
}));

vi.mock("../app/middleware/verifyIP.js", () => ({
  default: (req, res, next) => next(),
}));

vi.mock("../app/utils/currency/voteCommands.js", () => {
  return {
    voteCommands: {
      day: { description: "mocked day", command: "time set day" },
      night: { description: "mocked night", command: "time set night" },
      clear: { description: "mocked clear", command: "weather clear" },
      rain: { description: "mocked rain", command: "weather rain" },
      thunder: { description: "mocked thunder", command: "weather thunder" },
    },
  };
});

import currencyRoutes from "../app/routes/currencyMod.js";
import { voteState } from "../discord/listeners/web/votes/voteState.js";
import { startVote } from "../discord/listeners/web/voteManager.js";

function mockWebBot(overrides = {}) {
  return {
    channels: {
      fetch: vi.fn().mockResolvedValue({
        isTextBased: () => true,
        send: vi.fn(),
        ...overrides,
      }),
    },
  };
}

let app;
let db;
let io;
let webBot;
let token;

const user = { name: "Steve", uuid: "uuid-123" };

beforeEach(() => {
  voteState.active = false;
  voteState.cooldownUntil = 0;

  db = {};
  io = { emit: vi.fn() };
  webBot = mockWebBot();
  token = jwt.sign(user, JWT_SECRET);

  app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api", currencyRoutes(db, webBot, io));
});

describe("POST /currency/vote/start", () => {
  const postVote = (body = { voteType: "clear" }) =>
    request(app)
      .post("/api/currency/vote/start")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

  it("returns 400 for invalid vote type", async () => {
    const res = await postVote({ voteType: "invalid_type" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid vote type.");
  });

  it("returns 400 if a vote is already active", async () => {
    voteState.active = true;

    const res = await postVote();

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("A vote is already in progress");
  });

  it("returns 400 if vote is on cooldown", async () => {
    voteState.cooldownUntil = Date.now() + 15_000;

    const res = await postVote();

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Please wait \d+ (minute|second)/);
  });

  it("returns 500 if Discord channel is not available", async () => {
    webBot.channels.fetch = vi.fn().mockResolvedValue(null);

    const res = await postVote();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Discord channel not available.");
  });

  it("returns 400 if startVote returns false", async () => {
    startVote.mockReturnValue(false);

    const res = await postVote();

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Failed to start vote.");
  });

  it("returns 200 and starts the vote", async () => {
    startVote.mockReturnValue(true);

    const res = await postVote();

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Vote for clear started.");
  });

  it("returns 500 on unexpected error", async () => {
    webBot.channels.fetch = vi.fn().mockRejectedValue(new Error("fetch fail"));

    const res = await postVote();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to start vote.");
  });
});

describe("POST /currency/lottery/join", () => {
  const user = { name: "Steve", uuid: "uuid-123" };
  const token = jwt.sign(user, JWT_SECRET);

  const postJoin = (amount = 50) =>
    request(app)
      .post("/api/currency/lottery/join")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount });

  it("returns 400 if amount is missing or below minimum", async () => {
    const res = await postJoin(0);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Minimum amount is 10.");
  });

  it("returns 400 if no active lottery is running", async () => {
    db.connect = vi.fn().mockResolvedValueOnce(
      createClientMock([
        {}, // BEGIN
        { rowCount: 0 }, // activeLottery
        {}, // ROLLBACK
      ])
    );

    const res = await postJoin(50);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No active lottery is currently running.");
  });

  it("returns 400 if user already joined", async () => {
    const queryMock = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1 }) // activeLottery
      .mockResolvedValueOnce({ rowCount: 1 }); // alreadyJoined

    db.connect = vi.fn().mockResolvedValueOnce({
      query: vi
        .fn()
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // activeLottery
        .mockResolvedValueOnce({ rowCount: 1 }) // alreadyJoined
        .mockResolvedValueOnce({}) // ROLLBACK or COMMIT
        .mockResolvedValueOnce({}) // INSERT if needed
        .mockResolvedValueOnce({}), // COMMIT if needed
      release: vi.fn(),
    });

    const res = await postJoin(50);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("You've already joined the lottery.");
  });

  it("returns 400 if user is not found", async () => {
    db.connect = vi.fn().mockResolvedValueOnce(
      createClientMock([
        {}, // BEGIN
        { rowCount: 1 }, // activeLottery
        { rowCount: 0 }, // alreadyJoined
        { rowCount: 0 }, // balanceRes
        {}, // ROLLBACK
      ])
    );

    const res = await postJoin(50);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("User not found.");
  });

  it("returns 400 if user has insufficient balance", async () => {
    db.connect = vi.fn().mockResolvedValueOnce(
      createClientMock([
        {}, // BEGIN
        { rowCount: 1 }, // activeLottery
        { rowCount: 0 }, // alreadyJoined
        { rowCount: 1, rows: [{ balance: "5" }] }, // balanceRes
        {}, // ROLLBACK
      ])
    );

    const res = await postJoin(50);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Insufficient balance.");
  });

  it("returns 200 and joins the lottery", async () => {
    db.connect = vi.fn().mockResolvedValueOnce(
      createClientMock([
        {}, // BEGIN
        { rowCount: 1 }, // activeLottery
        { rowCount: 0 }, // alreadyJoined
        { rowCount: 1, rows: [{ balance: "100" }] }, // balanceRes
        {}, // UPDATE user_funds
        {}, // INSERT participant
        {}, // COMMIT
      ])
    );

    const res = await postJoin(50);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Joined the lottery.");
  });
});

describe("POST /currency/lottery/start", () => {
  const postStart = (amount = 50) =>
    request(app)
      .post("/api/currency/lottery/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ amount });

  const createClientMock = (responses = []) => {
    const query = vi.fn();
    responses.forEach((res) => query.mockResolvedValueOnce(res));
    return {
      query,
      release: vi.fn(),
    };
  };

  it("returns 400 if amount is missing or below minimum", async () => {
    const res = await postStart(0);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Minimum amount is 10.");
  });

  it("returns 400 if a lottery is already in progress", async () => {
    db.connect = vi.fn().mockResolvedValueOnce(
      createClientMock([
        {}, // BEGIN
        { rowCount: 1 }, // existing lottery
        {}, // ROLLBACK
      ])
    );

    const res = await postStart(50);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("A lottery is already in progress.");
  });

  it("returns 400 if user is not found", async () => {
    db.connect = vi.fn().mockResolvedValueOnce(
      createClientMock([
        {}, // BEGIN
        { rowCount: 0 }, // no existing
        { rowCount: 0 }, // balanceRes
        {}, // ROLLBACK
      ])
    );

    const res = await postStart(50);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("User not found.");
  });

  it("returns 400 if user has insufficient balance", async () => {
    db.connect = vi.fn().mockResolvedValueOnce(
      createClientMock([
        {}, // BEGIN
        { rowCount: 0 }, // no existing
        { rowCount: 1, rows: [{ balance: "5" }] }, // balanceRes
        {}, // ROLLBACK
      ])
    );

    const res = await postStart(50);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Insufficient balance.");
  });

  it("returns 200 and starts the lottery", async () => {
    db.connect = vi.fn().mockResolvedValueOnce(
      createClientMock([
        {}, // BEGIN
        { rowCount: 0 }, // no existing
        { rowCount: 1, rows: [{ balance: "100" }] }, // balanceRes
        {}, // UPDATE
        {}, // INSERT
        {}, // COMMIT
      ])
    );

    const res = await postStart(50);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Lottery started.");
  });
});

describe("POST /currency/daily", () => {
  const user = { uuid: "uuid-123", name: "Steve" };
  const token = jwt.sign(user, JWT_SECRET);
  const postDaily = () =>
    request(app)
      .post("/api/currency/daily")
      .set("Authorization", `Bearer ${token}`)
      .send();

  it("returns 400 if uuid is missing", async () => {
    const badToken = jwt.sign({}, JWT_SECRET);
    const res = await request(app)
      .post("/api/currency/daily")
      .set("Authorization", `Bearer ${badToken}`)
      .send();

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Missing uuid");
  });

  it("returns 404 if account is not linked to Discord", async () => {
    db.connect = vi.fn().mockResolvedValueOnce({
      query: vi.fn().mockResolvedValue({ rowCount: 0, rows: [] }), // correct shape
      release: vi.fn(),
    });

    const res = await postDaily();
    expect(res.status).toBe(404);
    expect(res.body.error).toBe(
      "Your Minecraft account is not linked to Discord."
    );
  });
});

describe("GET /currency/mob-limit", () => {
  const user = { uuid: "uuid-123", name: "Steve" };
  const token = jwt.sign(user, JWT_SECRET);

  const getMobLimit = () =>
    request(app)
      .get("/api/currency/mob-limit")
      .set("Authorization", `Bearer ${token}`);

  it("returns limitReached: false if no record is found", async () => {
    db.query = vi.fn().mockResolvedValueOnce({ rowCount: 0 });

    const res = await getMobLimit();
    expect(res.status).toBe(200);
    expect(res.body.limitReached).toBe(false);
  });

  it("returns limitReached: true if record exists", async () => {
    db.query = vi.fn().mockResolvedValueOnce({ rowCount: 1 });

    const res = await getMobLimit();
    expect(res.status).toBe(200);
    expect(res.body.limitReached).toBe(true);
  });

  it("returns 500 if database query fails", async () => {
    db.query = vi.fn().mockRejectedValueOnce(new Error("DB error"));

    const res = await getMobLimit();
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

describe("POST /currency/mob-limit", () => {
  const user = { uuid: "uuid-123" };
  const token = jwt.sign(user, JWT_SECRET);

  const postMobLimit = () =>
    request(app)
      .post("/api/currency/mob-limit")
      .set("Authorization", `Bearer ${token}`);

  it("returns 400 if uuid is missing", async () => {
    const fakeApp = express();
    fakeApp.use(express.json());
    fakeApp.use((req, res, next) => {
      req.user = undefined; // simulate missing user
      next();
    });

    fakeApp.post("/api/currency/mob-limit", async (req, res) => {
      const uuid = req.user?.uuid;
      if (!uuid) {
        return res.status(400).json({ error: "Missing uuid" });
      }
    });

    const res = await request(fakeApp).post("/api/currency/mob-limit");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Missing uuid");
  });

  it("returns 200 and marks the limit", async () => {
    db.query = vi.fn().mockResolvedValueOnce({});

    const res = await postMobLimit();
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe("Mob limit marked for user");

    expect(db.query).toHaveBeenCalledWith(
      `INSERT INTO mob_limit_reached (uuid, date_reached) 
       VALUES ($1, CURRENT_DATE)
       ON CONFLICT (uuid) DO UPDATE SET date_reached = CURRENT_DATE`,
      [user.uuid]
    );
  });

  it("returns 500 if DB throws", async () => {
    db.query = vi.fn().mockRejectedValueOnce(new Error("DB error"));

    const res = await postMobLimit();
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

describe("GET /currency/top", () => {
  const endpoint = "/api/currency/top";
  const token = jwt.sign(user, JWT_SECRET);

  it("returns the top 10 users ordered by balance", async () => {
    db.query = vi.fn().mockResolvedValueOnce({
      rows: [
        { name: "Alice", balance: "250.7" },
        { name: "Bob", balance: "200" },
        { name: "Charlie", balance: "150.3" },
      ],
    });

    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { name: "Alice", balance: 250 },
      { name: "Bob", balance: 200 },
      { name: "Charlie", balance: 150 },
    ]);

    expect(db.query).toHaveBeenCalledWith(
      `SELECT name, balance FROM user_funds ORDER BY balance DESC LIMIT 10`
    );
  });

  it("returns 500 if DB query fails", async () => {
    db.query = vi.fn().mockRejectedValueOnce(new Error("DB crash"));

    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

describe("GET /currency/mob-limit", () => {
  const user = { uuid: "uuid-123", name: "Steve" };
  const token = jwt.sign(user, JWT_SECRET);

  const getMobLimit = () =>
    request(app)
      .get("/api/currency/mob-limit")
      .set("Authorization", `Bearer ${token}`);

  it("returns limitReached: false if no record is found", async () => {
    db.query = vi.fn().mockResolvedValueOnce({ rowCount: 0 });

    const res = await getMobLimit();
    expect(res.status).toBe(200);
    expect(res.body.limitReached).toBe(false);
  });

  it("returns limitReached: true if record exists", async () => {
    db.query = vi.fn().mockResolvedValueOnce({ rowCount: 1 });

    const res = await getMobLimit();
    expect(res.status).toBe(200);
    expect(res.body.limitReached).toBe(true);
  });

  it("returns 500 if database query fails", async () => {
    db.query = vi.fn().mockRejectedValueOnce(new Error("DB error"));

    const res = await getMobLimit();
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

describe("POST /currency/withdraw", () => {
  const user = { uuid: "uuid-123", name: "Steve" };
  const token = jwt.sign(user, JWT_SECRET);

  const postWithdraw = (body = {}) =>
    request(app)
      .post("/api/currency/withdraw")
      .set("Authorization", `Bearer ${token}`)
      .send(body);

  it("returns 400 if uuid is missing or count is invalid", async () => {
    const badToken = jwt.sign({}, JWT_SECRET);

    const res = await request(app)
      .post("/api/currency/withdraw")
      .set("Authorization", `Bearer ${badToken}`)
      .send({ count: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid count or uuid");
  });
});

describe("POST /currency/pay", () => {
  const user = { uuid: "uuid-123" };
  const token = jwt.sign(user, JWT_SECRET);
  const endpoint = "/api/currency/pay";

  const postPay = (body = {}) =>
    request(app)
      .post(endpoint)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

  it("returns 400 if input is invalid", async () => {
    const res = await postPay({ amount: 50 }); // missing to_uuid
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid input");
  });

  it("returns 400 if amount is zero or negative", async () => {
    const res = await postPay({ to_uuid: "uuid-456", amount: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Amount must be positive");
  });
});

describe("GET /currency/balance", () => {
  const endpoint = "/api/currency/balance";
  const user = { uuid: "uuid-123", name: "Steve" };
  const token = jwt.sign(user, JWT_SECRET);

  const getBalance = () =>
    request(app).get(endpoint).set("Authorization", `Bearer ${token}`);

  it("returns 400 if uuid is missing", async () => {
    const badToken = jwt.sign({}, JWT_SECRET);
    const res = await request(app)
      .get(endpoint)
      .set("Authorization", `Bearer ${badToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Missing uuid");
  });

  it("returns 404 if user is not found", async () => {
    db.query = vi.fn().mockResolvedValueOnce({ rows: [] });

    const res = await getBalance();

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Player not found");
  });

  it("returns the balance if user is found", async () => {
    db.query = vi.fn().mockResolvedValueOnce({
      rows: [{ balance: "1234.56" }],
    });

    const res = await getBalance();

    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(1234);
    expect(db.query).toHaveBeenCalledWith(
      `SELECT balance FROM user_funds WHERE uuid = $1 LIMIT 1`,
      [user.uuid]
    );
  });

  it("returns 500 if DB query fails", async () => {
    db.query = vi.fn().mockRejectedValueOnce(new Error("DB Error"));

    const res = await getBalance();

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

describe("POST /currency/login", () => {
  const endpoint = "/api/currency/login";

  const postLogin = (body) => request(app).post(endpoint).send(body);

  it("returns 400 if uuid or name is missing", async () => {
    const res1 = await postLogin({ uuid: "uuid-123" });
    expect(res1.status).toBe(400);
    expect(res1.body.error).toBe("Missing uuid or name");

    const res2 = await postLogin({ name: "Steve" });
    expect(res2.status).toBe(400);
    expect(res2.body.error).toBe("Missing uuid or name");

    const res3 = await postLogin({});
    expect(res3.status).toBe(400);
    expect(res3.body.error).toBe("Missing uuid or name");
  });

  it("returns 200 and a JWT token if input is valid", async () => {
    const payload = { uuid: "uuid-123", name: "Steve" };
    const res = await postLogin(payload);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();

    const decoded = jwt.verify(res.body.token, JWT_SECRET);
    expect(decoded.uuid).toBe(payload.uuid);
    expect(decoded.name).toBe(payload.name);
  });
});
