import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs/promises";
import logger from "../logger";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const PROMPT_PATH = path.join(__dirname, "assistantPrompt.txt");
let assistantSystemPrompt =
  "You are CreateringtonAI, the official assistant for the Createrington Minecraft server. Do NOT answer anything unrelated to this server. Only answer based on provided commands, ranks, or server features.";

let promptLoaded = false;
async function ensurePromptLoaded(): Promise<void> {
  if (promptLoaded) return;
  try {
    assistantSystemPrompt = await fs.readFile(PROMPT_PATH, "utf-8");
  } catch {
    logger.warn("Could not load assistant prompt file, using fallback.");
  } finally {
    promptLoaded = true;
  }
}

type Role = "system" | "user" | "assistant";
/**
 * Sends a question to the Createrington AI assistant and returns the response.
 *
 * @param {string} question - The user's question related to the Createrington Minecraft server.
 * @param {string} [context=""] - Optional prior assistant message context to help inform the reply.
 *
 * @returns {Promise<string>} - The assistant's textual response.
 */
export async function askAssistant(
  question: string,
  context = ""
): Promise<string> {
  await ensurePromptLoaded();

  const messages: Array<{ role: Role; content: string }> = [
    { role: "system", content: assistantSystemPrompt },
    ...(context ? [{ role: "assistant" as Role, content: context }] : []),
    { role: "user", content: question },
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.5,
      max_tokens: 500,
    });

    const content = response.choices?.[0]?.message?.content ?? "";
    return content.trim();
  } catch (err) {
    logger.error(
      `OpenAI request failed: ${err instanceof Error ? err.message : String(err)}`
    );
    throw new Error("Assistant is currently unavailable.");
  }
}

export default askAssistant;
