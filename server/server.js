import express from "express";
import { status } from "minecraft-server-util";
import { Server } from "socket.io";
import { Rcon } from "rcon-client";
import pg from "pg";
import bodyParser from "body-parser";
import http from "http";
import env from "dotenv";
import cors from "cors";

env.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

const db = new pg.Client({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

db.connect();

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

app.post("/wait-list", async (req, res) => {
  const { mcName, dcName, age, howFound, experience, whyJoin } = req.body;

  const insertQuery = `
      INSERT INTO applications (mc_name, dc_name, age, how_found, experience, why_join)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

  try {
    const result = await db.query(insertQuery, [
      mcName,
      dcName,
      age,
      howFound || null,
      experience || null,
      whyJoin,
    ]);
    res.json({ success: true, application: result.rows[0] });
  } catch (error) {
    console.error("Error inserting application:", error);
    res.status(500).json({ error: "Error submitting application" });
  }
});

app.post("/api/waitlist", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const insertQuery = `
        INSERT INTO waitlist_emails (email)
        VALUES ($1)
        RETURNING *
      `;
    const result = await db.query(insertQuery, [email]);
    res.json({ success: true, email: result.rows[0] });
  } catch (error) {
    console.error("Error inserting waitlist email:", error);
    res.status(500).json({ error: "Error submitting email" });
  }
});

httpServer.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
