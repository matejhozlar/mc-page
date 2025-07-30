import { exitIfNotProduction } from "../../../utils/production/onlyInProduction.js";
import { voteState } from "./votes/voteState.js";

/**
 * Sets up a vote listener on the webBot to allow users to vote on Minecraft server time/weather changes.
 * Only runs in production mode.
 *
 * @param {import('discord.js').Client} webBot - The Discord.js client representing the web bot.
 * @param {{ io: import('socket.io').Server }} context - An object containing a Socket.IO server instance.
 */
export default function setupVoteListener(webBot) {
  if (!exitIfNotProduction()) return;

  const minecraftChannelId = process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID;
  const createringtonBotId = process.env.CLIENT_BOT_ID;

  webBot.on("messageCreate", async (msg) => {
    if (msg.channelId !== minecraftChannelId) return;
    if (msg.author.id !== createringtonBotId) return;

    const match = msg.content.match(/^`<([^>]+)>`\s*(1|2)$/);
    if (!match || !voteState.active) return;

    const [_, username, vote] = match;
    if (voteState.voters.has(username)) return;

    if (vote === "1") voteState.counts.yes++;
    else if (vote === "2") voteState.counts.no++;

    voteState.voters.add(username);
  });
}
