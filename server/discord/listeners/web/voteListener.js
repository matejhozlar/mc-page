import { sendRconCommand } from "../../../utils/rcon/sendRconCommand.js";
import logger from "../../../logger.js";
import { exitIfNotProduction } from "../../../utils/production/onlyInProduction.js";

let voteActive = false;
let voteCooldownUntil = 0;
let voteCounts = { yes: 0, no: 0 };
let voters = new Set();

const SUCCESS_COOLDOWN_MS = 577100;
const FAIL_COOLDOWN_MS = 3 * 60 * 1000;

function msToMinutesSeconds(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes} minute${minutes !== 1 ? "s" : ""} ${seconds} second${
    seconds !== 1 ? "s" : ""
  }`;
}

const voteCommands = {
  ".day": {
    description: "set time to day",
    command: "time set day",
  },
  ".rain": {
    description: "start rain",
    command: "weather rain",
  },
  ".thunder": {
    description: "start thunderstorm",
    command: "weather thunder",
  },
  ".clear": {
    description: "clear the weather",
    command: "weather clear",
  },
};

/**
 * Sets up a vote listener on the webBot to allow users to vote on Minecraft server time/weather changes.
 * Only runs in production mode.
 *
 * @param {import('discord.js').Client} webBot - The Discord.js client representing the web bot.
 * @param {{ io: import('socket.io').Server }} context - An object containing a Socket.IO server instance.
 */
export default function setupVoteListener(webBot, { io }) {
  if (!exitIfNotProduction()) return;

  const minecraftChannelId = process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID;
  const createringtonBotId = process.env.CLIENT_BOT_ID;

  webBot.on("messageCreate", async (message) => {
    if (message.channelId !== minecraftChannelId) return;
    if (message.author.id !== createringtonBotId) return;

    const content = message.content.trim();
    const voteCommandMatch = content.match(
      /^`<[^>]+>`\s*(\.day|\.rain|\.thunder|\.clear)$/i
    );
    if (!voteCommandMatch) return;

    const command = voteCommandMatch[1].toLowerCase();
    const voteDetails = voteCommands[command];
    if (!voteDetails) return;

    const now = Date.now();
    if (voteActive) return;

    if (voteCooldownUntil > now) {
      const remaining = voteCooldownUntil - now;
      const waitMsg = msToMinutesSeconds(remaining);
      const text = `⏳ Please wait ${waitMsg} before starting another vote.`;
      await message.channel.send(text);
      io.emit("chatMessage", { text, authorType: "web" });
      return;
    }

    voteActive = true;
    voteCounts = { yes: 0, no: 0 };
    voters.clear();

    const voteText = `**Vote to ${voteDetails.description} has started!**\nReply with \`1\` for **yes**, \`2\` for **no**.\nVoting ends in 30 seconds...`;
    await message.channel.send(voteText);
    io.emit("chatMessage", { text: voteText, authorType: "web" });

    const collector = message.channel.createMessageCollector({ time: 30000 });

    collector.on("collect", (msg) => {
      if (msg.author.id !== createringtonBotId) return;

      const voteMatch = msg.content.match(/^`<([^>]+)>`\s*(1|2)$/);
      if (!voteMatch) return;

      const username = voteMatch[1];
      const vote = voteMatch[2];

      if (voters.has(username)) return;

      if (vote === "1") voteCounts.yes++;
      else if (vote === "2") voteCounts.no++;

      voters.add(username);
    });

    collector.on("end", async () => {
      const { yes, no } = voteCounts;
      let resultMsg = "";
      let cooldown = FAIL_COOLDOWN_MS;

      if (yes > no) {
        resultMsg = `✅ Vote passed! Executing: ${voteDetails.command}`;
        await sendRconCommand(voteDetails.command);
        cooldown = SUCCESS_COOLDOWN_MS;
      } else if (yes === no) {
        resultMsg = "It's a tie. Nothing changes.";
      } else {
        resultMsg = "❌ Vote failed. Staying as is.";
      }

      const text = `**📊 Vote Results**\nYes: ${yes} | No: ${no}\n${resultMsg}`;
      await message.channel.send(text);
      io.emit("chatMessage", { text, authorType: "web" });

      voteActive = false;
      voteCooldownUntil = Date.now() + cooldown;
    });
  });
}
