import express from "express";
import multer from "multer";
import { AttachmentBuilder } from "discord.js";
import logger from "../../logger.js";

/**
 * Handles image uploads from the web chat and relays them to Discord.
 *
 * @param {import("socket.io").Server} io - The Socket.IO instance to emit live updates.
 * @param {import("discord.js").Client} webChatClient - The Discord web bot client.
 * @returns {import("express").Router}
 */
// --- /api/upload-image ---
export default function uploadImageRoute(io, webChatClient) {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage() });

  const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const MAX_SIZE_BYTES = 10 * 1024 * 1024;

  router.post("/upload-image", upload.single("image"), async (req, res) => {
    const file = req.file;
    const messageText = req.body.message || "";
    const authorName = req.body.authorName || "web";

    if (!file) {
      logger.warn(
        `Image upload attempt failed — no file received from ${authorName}`
      );
      return res.status(400).json({ error: "No image uploaded" });
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      logger.warn(
        `Invalid file type from ${authorName}: ${file.originalname} (${file.mimetype})`
      );
      return res.status(400).json({ error: "Invalid image type" });
    }

    if (file.size > MAX_SIZE_BYTES) {
      logger.warn(
        `File too large from ${authorName}: ${file.originalname} (${file.size} bytes)`
      );
      return res.status(400).json({ error: "Image too large (max 1MB)" });
    }

    logger.info(
      `Received image upload from ${authorName}: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`
    );

    try {
      const guild = await webChatClient.guilds.fetch(
        process.env.DISCORD_GUILD_ID
      );
      const channel = guild.channels.cache.get(
        process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID
      );

      if (!channel?.isTextBased?.()) {
        logger.error(
          "Image upload failed: Channel not found or not text-based."
        );
        return res
          .status(500)
          .json({ error: "Channel not found or not text-based" });
      }

      const formattedMessage = `<${authorName}> ${messageText}`;

      const attachment = new AttachmentBuilder(file.buffer, {
        name: file.originalname,
      });

      const sentMessage = await channel.send({
        content: formattedMessage,
        files: [attachment],
      });

      const sentAttachment = sentMessage.attachments.first();
      const imageUrl = sentAttachment?.url || null;

      logger.info(
        `Image uploaded and sent by ${authorName} — Discord URL: ${imageUrl}`
      );

      io.emit("chatMessage", {
        text: formattedMessage,
        image: imageUrl,
        authorType: "web",
      });

      return res.json({ success: true, image: imageUrl });
    } catch (error) {
      logger.error(
        `Failed to send image to Discord from ${authorName}: ${error}`
      );
      return res.status(500).json({ error: "Failed to send image" });
    }
  });

  return router;
}
