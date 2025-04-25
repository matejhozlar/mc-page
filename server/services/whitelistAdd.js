import { Rcon } from "rcon-client";
import dotenv from "dotenv";

dotenv.config();

async function whitelistPlayer(playerName) {
  try {
    const rcon = await Rcon.connect({
      host: process.env.SERVER_IP,
      port: process.env.RCON_PORT,
      password: process.env.RCON_PASSWORD,
    });

    console.log(`Connected to RCON. Whitelisting player: ${playerName}...`);

    const response = await rcon.send(`whitelist add ${playerName}`);
    console.log(`Server response: ${response}`);

    rcon.end();
  } catch (err) {
    console.error("Error connecting to RCON:", err);
  }
}

// Get the player name from command-line args
const playerName = process.argv[2];
if (!playerName) {
  console.log("Usage: node whitelist.js <playerName>");
  process.exit(1);
}

whitelistPlayer(playerName);
