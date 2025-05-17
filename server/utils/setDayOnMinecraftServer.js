import { sendRconCommand } from "./sendRconCommand.js";

export async function setDayOnMinecraftServer() {
  await sendRconCommand("time set day");
}
