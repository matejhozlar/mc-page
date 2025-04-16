import express from "express";
import { status } from "minecraft-server-util";
import { Server } from "socket.io";
import { Rcon } from "rcon-client";
import http from "http";
import env from "dotenv";
import cors from "cors";

env.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());

const serverIP = process.env.SERVER_IP;
const serverPort = 26980;

async function sendChatToMinecraft(message) {
  try {
    const rcon = await Rcon.connect({
      host: process.env.SERVER_IP,
      port: parseInt(process.env.RCON_PORT) || 25583,
      password: process.env.RCON_PASSWORD,
    });

    const response = await rcon.send(`say ${message}`);
    console.log("RCON response:", response);
    await rcon.end();
  } catch (error) {
    console.error("Error sending RCON command:", error);
  }
}

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log(`New socket connected: ${socket.id}`);

  socket.on("sendChatMessage", async (message) => {
    console.log(`Message received from ${socket.id}: ${message}`);

    io.emit("chatMessage", message);

    await sendChatToMinecraft(message);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

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

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
