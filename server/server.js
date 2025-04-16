import express from "express";
import { status } from "minecraft-server-util";
import env from "dotenv";
import cors from "cors";

env.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());

const serverIP = process.env.SERVER_IP;
const serverPort = 26980;

app.get("/api/playerCount", async (req, res) => {
  try {
    const response = await status(serverIP, serverPort, { timeout: 5000 });

    res.json({ count: response.players.online });
  } catch (error) {
    console.error("Error querying the server:", error);
    res.status(500).json({ error: "Failed to fetch player count" });
  }
});

app.get("/api/players", async (req, res) => {
  try {
    const response = await status(serverIP, serverPort, { timeout: 5000 });
    const players = response.players.sample || [];
    res.json({ players });
  } catch (error) {
    console.error("Error fetching players:", error);
    res.status(500).json({ error: "Could not fetch players" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
