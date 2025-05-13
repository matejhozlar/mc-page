import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import cookieParser from "cookie-parser";
import adminRoutes from "../routes/admin.js";
import { isAdmin } from "../services/admin.js";
import { Rcon } from "rcon-client";

vi.mock("../logger.js", () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("../utils/logError.js", () => ({
  default: (e) => e.message || "error",
}));
vi.mock("../services/admin.js", () => ({
  isAdmin: vi.fn(),
}));

vi.mock("rcon-client", () => {
  return {
    Rcon: {
      connect: vi.fn(),
    },
  };
});

describe("GET /api/admin/validate", () => {
  let app;
  let db;

  beforeEach(() => {
    db = { query: vi.fn() };
    app = express();
    app.use(cookieParser());
    app.use("/api", adminRoutes(db));
  });

  it("should return 400 if no session cookie is set", async () => {
    const res = await request(app).get("/api/admin/validate");
    expect(res.status).toBe(400);
    expect(res.body.valid).toBe(false);
  });

  it("should return { valid: true } if user is admin", async () => {
    isAdmin.mockResolvedValueOnce(true);
    const res = await request(app)
      .get("/api/admin/validate")
      .set("Cookie", "admin_session=admin123");

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
  });

  it("should return { valid: false } if user is not admin", async () => {
    isAdmin.mockResolvedValueOnce(false);
    const res = await request(app)
      .get("/api/admin/validate")
      .set("Cookie", "admin_session=notadmin");

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
  });

  it("should return 500 on error", async () => {
    isAdmin.mockRejectedValueOnce(new Error("DB failure"));
    const res = await request(app)
      .get("/api/admin/validate")
      .set("Cookie", "admin_session=error");

    expect(res.status).toBe(500);
    expect(res.body.valid).toBe(false);
  });
});

describe("POST /api/admin/logout", () => {
  let app;
  let db;

  beforeEach(() => {
    db = {};
    app = express();
    app.use(cookieParser());
    app.use("/api", adminRoutes(db));
  });

  it("clears the admin_session cookie and returns success", async () => {
    const res = await request(app)
      .post("/api/admin/logout")
      .set("Cookie", "admin_session=some-admin-id");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const setCookieHeader = res.header["set-cookie"];
    expect(setCookieHeader).toBeDefined();
    expect(setCookieHeader[0]).toContain("admin_session=;");
  });
});

describe("GET /api/admin/me", () => {
  let app;
  let db;

  beforeEach(() => {
    db = { query: vi.fn() };
    app = express();
    app.use(cookieParser());
    app.use("/api", adminRoutes(db));
  });

  it("returns 403 if no session cookie", async () => {
    const res = await request(app).get("/api/admin/me");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    isAdmin.mockResolvedValueOnce(false);

    const res = await request(app)
      .get("/api/admin/me")
      .set("Cookie", "admin_session=notadmin");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not an admin");
  });

  it("returns 404 if admin not found in DB", async () => {
    isAdmin.mockResolvedValueOnce(true);
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/admin/me")
      .set("Cookie", "admin_session=missinguser");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("User not found in database");
  });

  it("returns admin data if found", async () => {
    isAdmin.mockResolvedValueOnce(true);
    const user = { name: "Steve", discord_id: "admin123" };
    db.query.mockResolvedValueOnce({ rows: [user] });

    const res = await request(app)
      .get("/api/admin/me")
      .set("Cookie", "admin_session=admin123");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(user);
  });

  it("returns 500 on DB error", async () => {
    isAdmin.mockResolvedValueOnce(true);
    db.query.mockRejectedValueOnce(new Error("DB failure"));

    const res = await request(app)
      .get("/api/admin/me")
      .set("Cookie", "admin_session=admin123");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

describe("POST /api/admin/rcon", () => {
  let app;
  let db;

  beforeEach(() => {
    db = {
      query: vi.fn(),
    };
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use("/api", adminRoutes(db));
  });

  it("denies access without session cookie", async () => {
    const res = await request(app)
      .post("/api/admin/rcon")
      .send({ command: "/say hi" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("denies access if not admin", async () => {
    isAdmin.mockResolvedValue(false);
    const res = await request(app)
      .post("/api/admin/rcon")
      .set("Cookie", "admin_session=baduser")
      .send({ command: "/say no" });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not an admin");
  });

  it("executes silent command without logging", async () => {
    isAdmin.mockResolvedValue(true);
    db.query.mockResolvedValueOnce({ rows: [{ name: "AdminSteve" }] });
    Rcon.connect.mockResolvedValue({
      send: vi.fn().mockResolvedValue("ok"),
      end: vi.fn(),
    });

    const res = await request(app)
      .post("/api/admin/rcon")
      .set("Cookie", "admin_session=admin123")
      .send({ command: "/v get player1" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toBe("ok");
  });

  it("executes command and logs it", async () => {
    isAdmin.mockResolvedValue(true);
    db.query.mockResolvedValueOnce({ rows: [{ name: "AdminSteve" }] });
    Rcon.connect.mockResolvedValue({
      send: vi.fn().mockResolvedValue("Executed"),
      end: vi.fn(),
    });

    db.query.mockResolvedValueOnce({});

    const res = await request(app)
      .post("/api/admin/rcon")
      .set("Cookie", "admin_session=admin123")
      .send({ command: "/say hello" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.response).toBe("Executed");
  });

  it("returns 500 on RCON failure", async () => {
    isAdmin.mockResolvedValue(true);
    db.query.mockResolvedValueOnce({ rows: [{ name: "AdminSteve" }] });
    Rcon.connect.mockRejectedValue(new Error("RCON connection failed"));

    const res = await request(app)
      .post("/api/admin/rcon")
      .set("Cookie", "admin_session=admin123")
      .send({ command: "/say fail" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe("RCON failure");
  });
});

describe("GET /api/admin/users", () => {
  let app;
  let db;

  beforeEach(() => {
    db = { query: vi.fn() };
    app = express();
    app.use(cookieParser());
    app.use("/api", adminRoutes(db));
  });

  it("returns 403 if no session cookie", async () => {
    const res = await request(app).get("/api/admin/users");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    isAdmin.mockResolvedValueOnce(false);

    const res = await request(app)
      .get("/api/admin/users")
      .set("Cookie", "admin_session=notadmin");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not an admin");
  });

  it("returns user list for admin", async () => {
    isAdmin.mockResolvedValueOnce(true);
    const mockUsers = [
      {
        uuid: "uuid-123",
        name: "Steve",
        play_time_seconds: 1200,
        last_seen: "2024-01-01T00:00:00Z",
        online: true,
      },
    ];
    db.query.mockResolvedValueOnce({ rows: mockUsers });

    const res = await request(app)
      .get("/api/admin/users")
      .set("Cookie", "admin_session=admin123");

    expect(res.status).toBe(200);
    expect(res.body.users).toEqual(mockUsers);
  });

  it("returns 500 on DB error", async () => {
    isAdmin.mockResolvedValueOnce(true);
    db.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .get("/api/admin/users")
      .set("Cookie", "admin_session=admin123");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Database error");
  });
});

describe("GET /api/admin/vanish-status", () => {
  let app;
  let db;

  beforeEach(() => {
    db = { query: vi.fn() };
    app = express();
    app.use(cookieParser());
    app.use("/api", adminRoutes(db));
  });

  it("returns 403 if no session cookie", async () => {
    const res = await request(app).get("/api/admin/vanish-status");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 403 if user is not admin", async () => {
    isAdmin.mockResolvedValueOnce(false);

    const res = await request(app)
      .get("/api/admin/vanish-status")
      .set("Cookie", "admin_session=nonadmin");

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not an admin");
  });

  it("returns 404 if admin not found in DB", async () => {
    isAdmin.mockResolvedValueOnce(true);
    db.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get("/api/admin/vanish-status")
      .set("Cookie", "admin_session=unknown");

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Admin not found");
  });

  it("returns vanish status if found", async () => {
    isAdmin.mockResolvedValueOnce(true);
    db.query.mockResolvedValueOnce({ rows: [{ vanished: true }] });

    const res = await request(app)
      .get("/api/admin/vanish-status")
      .set("Cookie", "admin_session=admin123");

    expect(res.status).toBe(200);
    expect(res.body.vanished).toBe(true);
  });

  it("returns 500 on DB error", async () => {
    isAdmin.mockResolvedValueOnce(true);
    db.query.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app)
      .get("/api/admin/vanish-status")
      .set("Cookie", "admin_session=admin123");

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});

describe("POST /api/admin/vanish-status", () => {
  let app;
  let db;

  beforeEach(() => {
    db = { query: vi.fn() };
    app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use("/api", adminRoutes(db));
  });

  it("returns 403 if no session cookie", async () => {
    const res = await request(app).post("/api/admin/vanish-status").send({});
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Unauthorized");
  });

  it("returns 400 if 'vanished' value is invalid", async () => {
    const res = await request(app)
      .post("/api/admin/vanish-status")
      .set("Cookie", "admin_session=admin123")
      .send({ name: "Steve", vanished: "yes" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid vanish value");
  });

  it("returns 403 if user is not admin", async () => {
    isAdmin.mockResolvedValueOnce(false);

    const res = await request(app)
      .post("/api/admin/vanish-status")
      .set("Cookie", "admin_session=notadmin")
      .send({ name: "Steve", vanished: true });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Not an admin");
  });

  it("returns 400 if player is not online", async () => {
    isAdmin.mockResolvedValueOnce(true);

    const send = vi.fn().mockResolvedValue("No player found with that name");
    const end = vi.fn();
    const { Rcon } = await import("rcon-client");
    Rcon.connect.mockResolvedValue({ send, end });

    const res = await request(app)
      .post("/api/admin/vanish-status")
      .set("Cookie", "admin_session=admin123")
      .send({ name: "OfflineSteve", vanished: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe(
      "Player must be online to update vanish status."
    );
  });

  it("updates vanish status successfully", async () => {
    isAdmin.mockResolvedValueOnce(true);

    const send = vi.fn().mockResolvedValue("Player is online");
    const end = vi.fn();
    const { Rcon } = await import("rcon-client");
    Rcon.connect.mockResolvedValue({ send, end });

    db.query.mockResolvedValueOnce();

    const res = await request(app)
      .post("/api/admin/vanish-status")
      .set("Cookie", "admin_session=admin123")
      .send({ name: "Steve", vanished: true });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 500 on internal failure", async () => {
    isAdmin.mockResolvedValueOnce(true);

    const { Rcon } = await import("rcon-client");
    Rcon.connect.mockRejectedValue(new Error("RCON error"));

    const res = await request(app)
      .post("/api/admin/vanish-status")
      .set("Cookie", "admin_session=admin123")
      .send({ name: "Steve", vanished: true });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});
