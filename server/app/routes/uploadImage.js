import express from "express";
import multer from "multer";
import { AttachmentBuilder } from "discord.js";
import logger from "../../logger.js";

export default function uploadImageRoute(
  io,
  webChatClient,
  MINECRAFT_CHANNEL_NAME
) {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage() });

  // --- /api/upload-image ---
  router.post("/upload-image", upload.single("image"), async (req, res) => {
    const file = req.file;
    const messageText = req.body.message || "";
    const authorName = req.body.authorName || "web";

    if (!file) {
      logger.warn(
        `❌ Image upload attempt failed — no file received from ${authorName}`
      );
      return res.status(400).json({ error: "No image uploaded" });
    }

    logger.info(
      `📷 Received image upload from ${authorName}: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`
    );

    try {
      const guild = await webChatClient.guilds.fetch(
        process.env.DISCORD_GUILD_ID
      );
      const channel = guild.channels.cache.find(
        (ch) => ch.name === MINECRAFT_CHANNEL_NAME
      );

      if (!channel || !channel.isTextBased()) {
        logger.error(
          "❌ Image upload failed: Discord channel not found or not text-based"
        );
        return res.status(500).json({ error: "Channel not found" });
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
        `✅ Image uploaded and sent by ${authorName} — Discord URL: ${imageUrl}`
      );

      io.emit("chatMessage", {
        text: formattedMessage,
        image: imageUrl,
        authorType: "web",
      });

      return res.json({ success: true, image: imageUrl });
    } catch (error) {
      logger.error(
        `❌ Failed to send image to Discord from ${authorName}: ${error}`
      );
      return res.status(500).json({ error: "Failed to send image" });
    }
  });

  return router;
}
