import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
import config from "../../config/index.js";

dotenv.config();

const { BLUE } = config.uiColors;

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const { CLIENT_BOT_TOKEN, DISCORD_MARKET_CHANNEL_ID } = process.env;

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  try {
    const channel = await client.channels.fetch(DISCORD_MARKET_CHANNEL_ID);

    const embed = new EmbedBuilder()
      .setTitle("🏢 Createrington Market – Early Access Guide")
      .setColor(BLUE)
      .setDescription(
        "Welcome to the **Createrington Market** – our brand new economy system for creating, managing, and growing companies!\n\n⚠️ **This is an EARLY version** — expect bugs, missing features, and big changes as we test everything."
      )
      .addFields(
        {
          name: "Getting Started",
          value: [
            "- [Click Here](https://create-rington.com)",
            "- Go to the **Market** tab in the navigation menu.",
            "- From your dashboard, you can create a company, view existing companies, or manage your requests.",
          ].join("\n"),
        },
        {
          name: "Creating a Company",
          value: [
            "- Go to **Market → Create Company**.",
            "- Fill in: Name, Short Description, Full Description.",
            "- Add optional images for **logo**, **banner** and **gallery**.",
            "- Submit your request for review by the server admins.",
            "- Some requests may require a **fee** to process.",
          ].join("\n"),
        },
        {
          name: "Editing Your Company",
          value: [
            "- Founders can click the **Edit** button on their company page.",
            "- Submit changes to descriptions or images.",
            "- If a fee is required, your edit will appear as **Awaiting Payment** until you pay.",
          ].join("\n"),
        },
        {
          name: "Managing Company Funds",
          value: [
            "- Founders see a **Manage** button on the company page.",
            "- **Deposit** – Move money from your personal balance into the company.",
            "- **Withdraw** – Transfer money from the company into your personal balance.",
            "- Both balances are always visible so you can plan smartly.",
          ].join("\n"),
        },
        {
          name: "Passive Company Interest",
          value: [
            "- Companies earn **hourly interest** if they have at least `$100` balance.",
            "- **Current rate:** `0.1% per hour` *(subject to change)*.",
            "- Example: `$1,000` → earns about `$24` in one day (if untouched).",
            "- The more your company holds, the more it earns.",
          ].join("\n"),
        },
        {
          name: "Requests & Statuses",
          value: [
            "- **Pending** – Waiting for admin review.",
            "- **Awaiting Payment** – Pay the required fee to proceed.",
            "- **Approved** – Your change is live.",
            "- **Rejected** – See the reason and resubmit if you want.",
            "- Manage all requests under **Market → Requests**.",
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
          name: "Bug Reporting",
          value: [
            "• Found an issue? **Open a ticket** in Discord",
            "• Include steps to reproduce + screenshots if possible",
          ].join("\n"),
        },
        {
          name: "💡 Tips",
          value: [
            "- Keep your company balance high to maximize interest gains.",
            "- Use unique, high-quality images for your brand.",
            "- Watch for upcoming features — early companies may get special bonuses later.",
          ].join("\n"),
        },
        {
          name: "📣 Reminder",
          value:
            "This is **not the final version** of the Market. All balances, interest rates, and mechanics may change during testing!",
        }
      )
      .setFooter({
        text: "Thanks for playing on Createrington!",
      })
      .setTimestamp();

    await channel.send({ embeds: [embed] });
    console.log("Market guide sent!");
  } catch (error) {
    console.error("Failed to send market guide:", error);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(CLIENT_BOT_TOKEN);
