export default function relayDiscordMessages(client, webBot, io) {
  const MINECRAFT_CHANNEL_NAME = "minecraft-chat";

  client.on("messageCreate", (message) => {
    if (
      !message.channel ||
      message.channel.name !== MINECRAFT_CHANNEL_NAME ||
      message.author.id === webBot.user?.id
    )
      return;

    const displayName = message.member?.displayName || message.author.username;
    const text = `[${displayName}]: ${message.content}`;
    const image = message.attachments.first()?.url || null;

    io.emit("chatMessage", { text, image });
  });
}
