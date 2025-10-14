import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import config from "../../config/index.js";
import dotenv from "dotenv";

dotenv.config();

const { GREEN } = config.uiColors;

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_MARKET_CHANNEL_ID } = process.env;

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(DISCORD_MARKET_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("🗺️ Createrington Market – Early Access Roadmap")
      .setColor(GREEN)
      .setDescription(
        [
          "The Market is in **EARLY ACCESS** — expect bugs, missing features, and rapid changes.",
        ].join("\n")
      )
      .addFields(
        {
          name: "✅ Phase 1 — Polish & Stability",
          value: [
            "• ✅ Core company creation, edits, approvals",
            "• ✅ Company funds: deposit / withdraw, basic history",
            "• ✅ Hourly interest for eligible companies",
            "• ✅ UI cleanup, mobile tweaks, performance passes",
          ].join("\n"),
        },
        {
          name: "🟢 Phase 2 — Shops & Economy Expansion (Current)",
          value: [
            "• ✅ Player **Shops** attached to companies",
            "• ✅ Custom **logo**, **banner**, **description**",
            "• ✅ **Item listings** with price, stock",
            "• ✅ Basic **reviews & ratings**",
          ].join("\n"),
        },
        {
          name: "Phase 3 — Teams & Permissions",
          value: [
            "• Company **roles**: Founder, Manager, Employee",
            "• **Granular permissions** (edit info, manage funds, run shops)",
            "• Activity logs for sensitive actions",
          ].join("\n"),
        },
        {
          name: "Phase 4 — Rewards & Incentives",
          value: [
            "• **Leaderboards** (weekly/monthly) — balance, sales, activity",
            "• **Payouts** for top performers (currency)",
            "• **Market Events** (boosted interest weeks, limited contracts)",
            "• **Online Shopping**",
          ].join("\n"),
        },
        {
          name: "Phase 5 — Player Investments",
          value: [
            "• Buy **shares** in other companies",
            "• Earn a cut of **interest** or **shop profits**",
            "• Creates a lightweight stock-market vibe & collaboration",
          ].join("\n"),
        },
        {
          name: "Early Access Notes",
          value: [
            "• Features may change **without warning**",
            "• Economy values (interest, fees) can change **anytime**",
            "• Your feedback directly shapes the roadmap",
          ].join("\n"),
        },
        {
          name: "Bug Reporting (Please help!)",
          value: [
            "• Found an issue? **Open a ticket** in Discord",
            "• Include steps to reproduce + screenshots if possible",
          ].join("\n"),
        },
        {
          name: "Future Ideas",
          value: [
            "• Shop themes & layout presets",
            "• Company badges & progression",
            "• Contracts between companies (supply deals)",
          ].join("\n"),
        }
      )
      .setFooter({
        text: "Thanks for playing on Createrington!",
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Market roadmap sent!");
  } catch (err) {
    console.error("Failed to send market roadmap:", err);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
