import { Router } from "express";
import { EmbedBuilder } from "discord.js";
import { initReviewFlow } from "../../lib/reviewFlow.js";
import logger from "../../logger.js";
import { isAdmin } from "../utils/admin/admin.js";

export default function adminEmbedRoutes(db, clientBot) {
  const router = Router();

  router.get("/admin/messages/channels", (req, res) => {
    const channels = Object.entries(process.env)
      .filter(([k]) => k.includes("CHANNEL"))
      .map(([key, id]) => ({ key, id }));
    res.json({ channels });
  });

  router.post("/admin/messages/submit", async (req, res) => {
    const discordId = req.signedCookies?.admin_session;

    if (!discordId) {
      logger.warn("Attempt to access /admin/submit without session cookie");
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const isAdminUser = await isAdmin(db, discordId);
      if (!isAdminUser) {
        logger.warn(`Unauthorized /admin/users access attempt by ${discordId}`);
        return res.status(403).json({ error: "Not an admin" });
      }

      const { channelKey, content, embed } = req.body;
      if (!channelKey)
        return res.status(400).json({ error: "channelKey required" });
      const announceChannelId = process.env[channelKey];
      if (!announceChannelId)
        return res.status(400).json({ error: "Unknown channelKey" });

      const eb = new EmbedBuilder();
      if (embed?.title) eb.setTitle(embed.title);
      if (embed?.description) eb.setDescription(embed.description);
      if (embed?.color) eb.setColor(embed.color);
      if (embed?.thumbnail) eb.setThumbnail(embed.thumbnail);
      if (embed?.footer) eb.setFooter({ text: embed.footer });
      (embed?.fields || []).forEach((f) => {
        if (f.name && f.value)
          eb.addFields({ name: f.name, value: f.value, inline: !!f.inline });
      });

      const { postForReview } = initReviewFlow(clientBot, {
        guildId: process.env.DISCORD_GUILD_ID,
        testChannelId: process.env.DISCORD_TEST_CHANNEL_ID,
        announceChannelId,
        customIdPrefix: "embedReview",
        canReview: (interaction) => {
          const reviewerRoleId = process.env.DISCORD_ADMIN_ROLE_ID;
          return reviewerRoleId
            ? interaction.member.roles.cache.has(reviewerRoleId)
            : true;
        },
      });

      const payloadEmbeds = [eb];
      await postForReview(payloadEmbeds);

      res.json({ ok: true });
    } catch (error) {
      logger.error(`Failed to submit embed: ${error}`);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
