import { OpenAI } from "openai";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import logger from "../logger.js";
import fs from "fs/promises";

/**
 * Sends a question to the Createrington AI assistant and returns the response.
 *
 * @param {string} question - The user's question related to the Createrington Minecraft server.
 * @param {string} [context=""] - Optional prior assistant message context to help inform the reply.
 *
 * @returns {Promise<string>} - The assistant's textual response.
 */

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const filepath = path.join(__dirname, "assistantPrompt.txt");
let assistantSystemPrompt =
  "You are CreateringtonAI, the official assistant for the Createrington Minecraft server. Do NOT answer anything unrelated to this server. Only answer based on provided commands, ranks, or server features.";

try {
  assistantSystemPrompt = await fs.readFile(filepath, "utf-8");
} catch (error) {
  logger.warn("Could not load assistant prompt file, using fallback.");
}

export async function askAssistant(question, context = "") {
  const messages = [
    { role: "system", content: assistantSystemPrompt },
    ...(context ? [{ role: "assistant", content: context }] : []),
    { role: "user", content: question },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    temperature: 0.5,
    max_tokens: 500,
  });

  return response.choices[0].message.content.trim();
}
