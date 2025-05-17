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

export function setupDayVoteListener(webChatClient, setDayCallback, io) {
  const minecraftChannelId = process.env.DISCORD_MINECRAFT_CHANNEL_ID;
  const createringtonBotId = process.env.CREATERINGTON_BOT_ID;

  webChatClient.on("messageCreate", async (message) => {
    if (message.channelId !== minecraftChannelId) return;
    if (message.author.id !== createringtonBotId) return;

    const content = message.content.trim();
    const isDayCommand = /^`<[^>]+>`\s*\.day$/i.test(content);

    if (!isDayCommand) return;

    const now = Date.now();
    if (voteActive) return;

    if (voteCooldownUntil > now) {
      const remaining = voteCooldownUntil - now;
      const waitMsg = msToMinutesSeconds(remaining);
      const text = `⏳ Please wait ${waitMsg} before starting another vote.`;
      await message.channel.send(text);
      io.emit("chatMessage", { text: `${text}`, authorType: "web" });
      return;
    }

    voteActive = true;
    voteCounts = { yes: 0, no: 0 };
    voters.clear();

    const text =
      "**Vote to set time to day has started!**\nReply with `1` for **yes**, `2` for **no**.\nVoting ends in 30 seconds...";
    await message.channel.send(text);
    io.emit("chatMessage", { text: `${text}`, authorType: "web" });

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
        resultMsg = "✅ Vote passed! Setting day...";
        await setDayCallback();
        cooldown = SUCCESS_COOLDOWN_MS;
      } else if (yes === no) {
        resultMsg = "It's a tie. Nothing changes.";
      } else {
        resultMsg = "❌ Vote failed. Staying as is.";
      }

      const text = `**📊 Vote Results**\nYes: ${yes} | No: ${no}\n${resultMsg}`;
      await message.channel.send(text);
      io.emit("chatMessage", { text: `${text}`, authorType: "web" });

      voteActive = false;
      voteCooldownUntil = Date.now() + cooldown;
    });
  });
}
