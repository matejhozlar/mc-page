import logger from "../../logger.js";

export default async function requestHistoryHandler(socket, webBot) {
  try {
    const guild = webBot.guilds.cache.first();
    const channel = guild?.channels.cache.find(
      (ch) => ch.name === "minecraft-chat"
    );

    if (!channel?.isTextBased()) return;

    const messages = await channel.messages.fetch({ limit: 100 });
    const webBotId = webBot.user.id;

    const filtered = [...messages.values()]
      .reverse()
      .filter((m) => !m.author.bot || m.author.id === webBotId)
      .map((m) => {
        const name = m.member?.displayName || m.author.username;
        return {
          text:
            m.author.id === webBotId ? m.content : `[${name}]: ${m.content}`,
          image: m.attachments.first()?.url || null,
        };
      });

    logger.info(`📨 Sending ${filtered.length} messages to client`);
    socket.emit("chatHistory", filtered);
  } catch (err) {
    logger.error(`❌ Failed to fetch chat history: ${err}`);
  }
}
