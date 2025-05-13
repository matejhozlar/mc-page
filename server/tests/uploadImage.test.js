import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import express from "express";
import multer from "multer";
import uploadImageRoute from "../routes/uploadImage.js";
import { Collection } from "discord.js";

vi.mock("discord.js", async () => {
  const actual = await vi.importActual("discord.js");
  return {
    ...actual,
    AttachmentBuilder: vi.fn().mockImplementation((buffer, options) => ({
      buffer,
      ...options,
    })),
  };
});

vi.mock("../logger.js", () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../utils/logError.js", () => ({
  default: (e) => e.message || "error",
}));

const mockSend = vi.fn();

const mockChannel = {
  isTextBased: () => true,
  send: mockSend,
};

const mockGuild = {
  channels: {
    cache: {
      find: () => mockChannel,
    },
  },
};

const mockWebChatClient = {
  guilds: {
    fetch: vi.fn().mockResolvedValue(mockGuild),
  },
};

const mockIo = {
  emit: vi.fn(),
};

describe("POST /api/upload-image", () => {
  let app;

  beforeEach(() => {
    app = express();
    const storage = multer.memoryStorage();
    const upload = multer({ storage });

    app.use(
      "/api",
      uploadImageRoute({
        upload,
        webChatClient: mockWebChatClient,
        io: mockIo,
        MINECRAFT_CHANNEL_NAME: "minecraft-chat",
      })
    );
  });

  it("returns 400 if no file is uploaded", async () => {
    const res = await request(app)
      .post("/api/upload-image")
      .field("authorName", "tester");

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No image uploaded");
  });

  it("returns 500 if Discord channel is not found", async () => {
    const badClient = {
      guilds: {
        fetch: vi.fn().mockResolvedValue({
          channels: {
            cache: {
              find: () => null,
            },
          },
        }),
      },
    };

    const appWithBadClient = express();
    const upload = multer({ storage: multer.memoryStorage() });

    appWithBadClient.use(
      "/api",
      uploadImageRoute({
        upload,
        webChatClient: badClient,
        io: mockIo,
        MINECRAFT_CHANNEL_NAME: "minecraft-chat",
      })
    );

    const res = await request(appWithBadClient)
      .post("/api/upload-image")
      .field("authorName", "tester")
      .attach("image", Buffer.from("image"), {
        filename: "fail.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to send image");
  });

  it("returns 500 if Discord send fails", async () => {
    mockSend.mockRejectedValueOnce(new Error("Discord send failed"));

    const res = await request(app)
      .post("/api/upload-image")
      .field("authorName", "tester")
      .attach("image", Buffer.from("image"), {
        filename: "fail.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Failed to send image");
  });
});
