import type { Client, Message } from "discord.js";
import { exitIfNotProduction } from "../../../utils/production/env-guard";
import { voteState } from "./votes/vote-state";

/**
 * Sets up a vote listener on the webBot to allow users to vote on Minecraft server time/weather changes.
 * Only runs in production mode.
 */
export default function setupVoteListener(webBot: Client): void {
  if (!exitIfNotProduction()) return;

  const minecraftChannelId = process.env.DISCORD_MINECRAFT_CHAT_CHANNEL_ID;
  const createringtonBotId = process.env.CLIENT_BOT_ID;

  webBot.on("messageCreate", async (msg: Message) => {
    if (!minecraftChannelId || !createringtonBotId) return;

    if (msg.channelId !== minecraftChannelId) return;
    if (msg.author.id !== createringtonBotId) return;

    const match = msg.content.match(/^`<([^>]+)>`\s*(1|2)$/);
    if (!match || !voteState.active) return;

    const [, username, vote] = match as [string, string, "1" | "2"];

    if (voteState.voters.has(username)) return;

    if (vote === "1") voteState.counts.yes++;
    else voteState.counts.no++;

    voteState.voters.add(username);
  });
}
